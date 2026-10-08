import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubble, ChatMessage } from '../../src/components/ChatBubble';
import {
  savePublicMessageLocally,
  savePrivateMessageLocally,
  getPublicMessagesLocally,
  getPrivateMessagesLocally
} from '../../src/database/dbQueries';
import { useNetworkStore } from '../../src/store/networkStore';
import { useAuthStore } from '../../src/store/authStore';
import { useDeviceStore } from '../../src/store/deviceStore';
import { BluetoothService } from '../../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../../src/services/lora/LoraPacketParser';
import { useNotificationStore } from '../../src/store/notificationStore';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useLanguageStore } from '../../src/i18n';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

import { getLocalNodeIdAsync, getLocalNodeIdSync } from '../../src/utils/nodeIdentity';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const t = useLanguageStore((s) => s.t);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const currentUser = useAuthStore((s) => s.user);

  const [connectedNodeName, setConnectedNodeName] = useState<string>(getLocalNodeIdSync());

  useEffect(() => {
    getLocalNodeIdAsync().then((id) => setConnectedNodeName(id));
  }, [currentUser]);

  const devices = useDeviceStore((s) => Object.values(s.devices));
  
  // Filter out the local self node to list only genuine peers for private chat
  const peerDevices = devices.filter((d) => {
    if (d.isSelf || d.deviceId === 'self' || d.deviceId === connectedNodeName) return false;
    const name = d.userName || d.deviceName || d.deviceId;
    return !!name;
  });

  const [chatTab, setChatTab] = useState<'public' | 'private'>('public');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [inputText, setInputText] = useState('');
  
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([]);
  const [messagesByDevice, setMessagesByDevice] = useState<Record<string, ChatMessage[]>>({});

  // Load historical public & private messages from local SQLite database on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const myId = await getLocalNodeIdAsync();
        const publicHistory = await getPublicMessagesLocally();
        if (publicHistory && publicHistory.length > 0) {
          const formatted: ChatMessage[] = publicHistory.map((m: any) => ({
            id: m.client_msg_id || `db_${m.id}`,
            senderName: m.sender_name === myId ? `${myId} (You)` : m.sender_name,
            message: m.message,
            timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00',
            isSelf: m.sender_name === myId || (m.sender_name && m.sender_name.includes('(You)')),
            synced: !!m.synced_at
          }));
          setPublicMessages(formatted);
        }

        const privateHistory = await getPrivateMessagesLocally();
        if (privateHistory && privateHistory.length > 0) {
          const pMap: Record<string, ChatMessage[]> = {};
          privateHistory.forEach((m: any) => {
            const isSelf = m.sender_name === myId || (m.sender_name && m.sender_name.includes('(You)'));
            const key = isSelf ? (m.receiver_id ? String(m.receiver_id) : 'Peer') : m.sender_name;
            const formatted: ChatMessage = {
              id: m.client_msg_id || `db_p_${m.id}`,
              senderName: isSelf ? `${myId} (You)` : m.sender_name,
              message: m.message,
              timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00',
              isSelf,
              synced: !!m.synced_at
            };
            pMap[key] = [...(pMap[key] || []), formatted];
          });
          setMessagesByDevice((prev) => ({ ...pMap, ...prev }));
        }
      } catch (err) {
        console.warn('[ChatScreen] History load error:', err);
      }
    }
    loadHistory();
  }, [connectedNodeName]);

  // Auto select first valid peer device if none selected or selected is invalid/self
  useEffect(() => {
    if ((!selectedDevice || selectedDevice === 'User' || selectedDevice === connectedNodeName) && peerDevices.length > 0) {
      setSelectedDevice(peerDevices[0].deviceId);
    }
  }, [peerDevices, selectedDevice, connectedNodeName]);

  // Real-time incoming packet listener for live Bluetooth/LoRa chat messages
  useEffect(() => {
    const unsubscribe = BluetoothService.getInstance().onDataReceived((rawPacket) => {
      const parsed = LoraPacketParser.parse(rawPacket);
      if (!parsed) return;

      const selfName = getLocalNodeIdSync();

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const msgId = `rx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      if (parsed.type === 'PUBLIC') {
        // Drop local echo
        if (parsed.senderId === selfName) return;

        const rxMsg: ChatMessage = {
          id: msgId,
          senderName: parsed.senderId,
          message: parsed.message,
          timestamp: timeStr,
          isSelf: false,
          synced: true
        };
        setPublicMessages((prev) => [...prev, rxMsg]);
        useDeviceStore.getState().registerDevice(parsed.senderId, parsed.senderId, parsed.senderId);
        useNotificationStore.getState().addNotification('team', `📢 Message from ${parsed.senderId}`, parsed.message);
        savePublicMessageLocally(1, 0, parsed.senderId, parsed.message, msgId, true).catch(console.warn);
      } else if (parsed.type === 'CHAT') {
        // Drop local echo
        if (parsed.senderId === selfName) return;

        // Accept if directed to self, to ALL, or unspecified
        const isForMe = !parsed.receiverId || parsed.receiverId === selfName || parsed.receiverId === 'ALL' || parsed.receiverId === 'User' || parsed.receiverId.toLowerCase() === selfName.toLowerCase();
        if (!isForMe) return;

        const rxMsg: ChatMessage = {
          id: msgId,
          senderName: parsed.senderId,
          message: parsed.message,
          timestamp: timeStr,
          isSelf: false,
          synced: true
        };
        const sender = parsed.senderId;

        // Auto-register sender in deviceStore so peer pill appears in UI immediately
        useDeviceStore.getState().registerDevice(sender, sender, sender);

        setMessagesByDevice((prev) => ({
          ...prev,
          [sender]: [...(prev[sender] || []), rxMsg]
        }));

        useNotificationStore.getState().addNotification('chat', `💬 Private Message from ${sender}`, parsed.message);
        setSelectedDevice(sender);

        savePrivateMessageLocally(0, currentUser?.id || 1, sender, parsed.message, msgId, true).catch(console.warn);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (!inputText || !inputText.trim()) return;

    if (!BluetoothService.getInstance().isConnected()) {
      Alert.alert(
        '🔌 Bluetooth Gateway Required',
        'Please connect your Bluetooth Gateway (ESP32 or Heltec LoRa) to send messages over LoRa radio mesh.'
      );
      return;
    }

    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const clientMsgId = `msg_${Date.now()}`;
      const selfName = await getLocalNodeIdAsync();
      const senderDisplayName = `${selfName} (You)`;

      const newMsg: ChatMessage = {
        id: clientMsgId,
        senderName: senderDisplayName,
        message: inputText.trim(),
        timestamp: timeStr,
        isSelf: true,
        synced: isOnline
      };

      const encodeBase64 = (str: string): string => {
        try {
          if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'utf-8').toString('base64');
          } else {
            // Standard Base64 Encoder
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let b64 = '';
            let i = 0;
            const utf8Str = unescape(encodeURIComponent(str));
            while (i < utf8Str.length) {
              const c1 = utf8Str.charCodeAt(i++);
              const c2 = i < utf8Str.length ? utf8Str.charCodeAt(i++) : NaN;
              const c3 = i < utf8Str.length ? utf8Str.charCodeAt(i++) : NaN;
              
              const e1 = c1 >> 2;
              const e2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
              const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
              const e4 = isNaN(c3) ? 64 : c3 & 63;
              
              b64 += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
            }
            return b64;
          }
        } catch (_) {
          return str;
        }
      };

      if (chatTab === 'public') {
        // 1. Instant UI update
        setPublicMessages((prev) => [...prev, newMsg]);
        // 2. Instant Bluetooth Radio Packet Dispatch (Base64 encoded for Web & LoRa mesh compatibility)
        const rawPublicPacket = `MSG,COMMON,${selfName},ALL,${encodeBase64(newMsg.message)}`;
        BluetoothService.getInstance().sendData(rawPublicPacket).catch(err => console.warn('[Chat] Public send error:', err));
        // 3. Background SQLite Storage
        savePublicMessageLocally(1, currentUser?.id || 1, selfName, newMsg.message, clientMsgId, isOnline).catch(console.warn);
      } else {
        const targetRecipient = selectedDevice.trim();
        if (!targetRecipient) {
          Alert.alert('Recipient Required', 'Please enter or select a recipient Call Sign (e.g. THANU or JESS) to send a private message.');
          return;
        }

        const recipientKey = targetRecipient;
        useDeviceStore.getState().registerDevice(recipientKey, recipientKey, recipientKey);

        // 1. Instant UI update for sender
        setMessagesByDevice((prev) => ({
          ...prev,
          [recipientKey]: [...(prev[recipientKey] || []), newMsg]
        }));

        // 2. Instant Bluetooth Radio Packet Dispatch (Base64 encoded for Web & LoRa mesh compatibility)
        const rawChatPacket = `MSG,PRIVATE,${selfName},${targetRecipient},${encodeBase64(newMsg.message)}`;
        BluetoothService.getInstance().sendData(rawChatPacket).catch(err => console.warn('[Chat] Private send error:', err));

        // 3. Background SQLite Storage
        savePrivateMessageLocally(currentUser?.id || 1, 2, selfName, newMsg.message, clientMsgId, isOnline).catch(console.warn);
      }

      setInputText('');
    } catch (err: any) {
      console.error('[ChatScreen] Error sending message:', err);
      Alert.alert('Send Error', err.message || 'Unable to send message');
    }
  };

  const currentMessages = chatTab === 'public' ? publicMessages : (messagesByDevice[selectedDevice] || []);
  const activeTargetDev = devices.find((d) => d.deviceId === selectedDevice || d.userName === selectedDevice);

  return (
    <ErrorBoundary fallbackTitle="Chat Screen Error">
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.responsiveWrapper}>
          {/* Chat Mode Switcher Header: Public Broadcast vs Private Messages */}
          <View style={styles.tabToggleRow}>
            <TouchableOpacity
              style={[styles.tabToggleBtn, chatTab === 'public' && styles.tabToggleBtnActive]}
              onPress={() => setChatTab('public')}
            >
              <Text style={[styles.tabToggleText, chatTab === 'public' && styles.tabToggleTextActive]}>
                📢 Public Team Channel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabToggleBtn, chatTab === 'private' && styles.tabToggleBtnActive]}
              onPress={() => setChatTab('private')}
            >
              <Text style={[styles.tabToggleText, chatTab === 'private' && styles.tabToggleTextActive]}>
                🔒 Private Message
              </Text>
            </TouchableOpacity>
          </View>

          {/* Teammate Device Selector Bar (Private Mode Only) */}
          {chatTab === 'private' ? (
            <View style={styles.deviceSelectorContainer}>
              <Text style={styles.selectorLabel}>👤 Select Teammate to Message:</Text>
              {peerDevices.length > 0 ? (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={peerDevices}
                  keyExtractor={(item) => item.deviceId}
                  contentContainerStyle={styles.devicePillList}
                  renderItem={({ item }) => {
                    const isSelected = selectedDevice === item.deviceId || selectedDevice === item.userName;
                    return (
                      <TouchableOpacity
                        style={[styles.devicePill, isSelected && styles.devicePillActive]}
                        onPress={() => setSelectedDevice(item.userName || item.deviceId)}
                      >
                        <Text style={[styles.devicePillText, isSelected && styles.devicePillTextActive]}>
                          🟢 {item.userName || item.deviceId}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              ) : (
                <Text style={{ color: Colors.textMuted, fontSize: 12, paddingVertical: 6 }}>
                  No other teammates connected nearby yet.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.peerBanner}>
              <Text style={styles.peerBannerTitle}>
                Broadcast Channel: <Text style={styles.peerHighlight}>Team 1 Public Mesh</Text>
              </Text>
              <Text style={styles.peerBannerSub}>🌐 Broadcasts to all connected field nodes</Text>
            </View>
          )}

          {/* Active Private Chat Peer Banner (Private Mode Only) */}
          {chatTab === 'private' && selectedDevice && selectedDevice !== 'User' && (
            <View style={styles.peerBanner}>
              <Text style={styles.peerBannerTitle}>
                🔒 Direct Message: <Text style={styles.peerHighlight}>{activeTargetDev?.userName || activeTargetDev?.deviceName || selectedDevice}</Text>
              </Text>
              <Text style={styles.peerBannerSub}>📡 {t('bluetooth_connected')}</Text>
            </View>
          )}

          {/* Messages List */}
          <FlatList
            data={currentMessages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.chatContainer}
            renderItem={({ item }) => <ChatBubble msg={item} />}
          />

          {/* Input Row */}
          <View style={[styles.inputRow, { paddingBottom: insets.bottom + Spacing.sm }]}>
            <TextInput
              style={styles.textInput}
              placeholder={chatTab === 'public' ? 'Broadcast message to entire team...' : `${t('type_message')}`}
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendBtnText}>{t('send')} ➔</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  responsiveWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center'
  },
  tabToggleRow: {
    flexDirection: 'row',
    padding: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.sm
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder
  },
  tabToggleBtnActive: {
    backgroundColor: '#18181B',
    borderColor: '#18181B'
  },
  tabToggleText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'OpenSans_700Bold'
  },
  tabToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  deviceSelectorContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.cardBorder
  },
  selectorLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: Spacing.xs + 2,
    fontFamily: 'OpenSans_700Bold'
  },
  devicePillList: {
    paddingBottom: Spacing.sm,
    gap: Spacing.xs + 2
  },
  devicePill: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder
  },
  devicePillActive: {
    backgroundColor: '#18181B',
    borderColor: '#18181B'
  },
  devicePillText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'OpenSans_600SemiBold'
  },
  devicePillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  peerBanner: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    borderBottomWidth: 1,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  peerBannerTitle: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'OpenSans_600SemiBold'
  },
  peerHighlight: {
    color: '#15803D',
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  peerBannerSub: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'OpenSans_400Regular'
  },
  chatContainer: {
    padding: Spacing.md
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm + 2,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.sm,
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    color: Colors.textPrimary,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    fontFamily: 'OpenSans_400Regular'
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm + 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'OpenSans_700Bold'
  }
});
