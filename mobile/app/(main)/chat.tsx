import React, { useState } from 'react';
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
import { savePrivateMessageLocally } from '../../src/database/dbQueries';
import { useNetworkStore } from '../../src/store/networkStore';
import { useAuthStore } from '../../src/store/authStore';
import { useDeviceStore } from '../../src/store/deviceStore';
import { BluetoothService } from '../../src/services/bluetooth/BluetoothService';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useLanguageStore } from '../../src/i18n';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const t = useLanguageStore((s) => s.t);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const currentUser = useAuthStore((s) => s.user);

  const devices = useDeviceStore((s) => Object.values(s.devices));
  const [selectedDevice, setSelectedDevice] = useState<string>('dev2');
  const [inputText, setInputText] = useState('');
  const [messagesByDevice, setMessagesByDevice] = useState<Record<string, ChatMessage[]>>({});

  const handleSend = async () => {
    if (!inputText || !inputText.trim()) return;

    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const clientMsgId = `msg_${Date.now()}`;
      const senderDisplayName = `${currentUser?.name || 'Arun'} (You)`;

      const newMsg: ChatMessage = {
        id: clientMsgId,
        senderName: senderDisplayName,
        message: inputText.trim(),
        timestamp: timeStr,
        isSelf: true,
        synced: isOnline
      };

      setMessagesByDevice((prev) => ({
        ...prev,
        [selectedDevice]: [...(prev[selectedDevice] || []), newMsg]
      }));

      await savePrivateMessageLocally(currentUser?.id || 1, 2, currentUser?.name || 'Arun', newMsg.message, clientMsgId, isOnline);

      const rawChatPacket = `CHAT,${currentUser?.name || 'Arun'},${selectedDevice},${newMsg.message}`;
      BluetoothService.getInstance().sendData(rawChatPacket);

      setInputText('');
    } catch (err: any) {
      console.error('[ChatScreen] Error sending message:', err);
      Alert.alert('Send Error', err.message || 'Unable to send message');
    }
  };

  const currentMessages = messagesByDevice[selectedDevice] || [];
  const activeTargetDev = devices.find((d) => d.deviceId === selectedDevice);

  return (
    <ErrorBoundary fallbackTitle="Chat Screen Error">
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.responsiveWrapper}>
          {/* BioSync Teammate / Device Selector Bar */}
          <View style={styles.deviceSelectorContainer}>
            <Text style={styles.selectorLabel}>🔒 {t('private_messages')} - {t('assigned_user')}:</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={devices}
              keyExtractor={(item) => item.deviceId}
              contentContainerStyle={styles.devicePillList}
              renderItem={({ item }) => {
                const isSelected = selectedDevice === item.deviceId;
                return (
                  <TouchableOpacity
                    style={[styles.devicePill, isSelected && styles.devicePillActive]}
                    onPress={() => setSelectedDevice(item.deviceId)}
                  >
                    <Text style={[styles.devicePillText, isSelected && styles.devicePillTextActive]}>
                      🟢 {item.userName || item.deviceId} ({item.deviceId})
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Active Private Chat Peer Banner */}
          <View style={styles.peerBanner}>
            <Text style={styles.peerBannerTitle}>
              {t('person')}: <Text style={styles.peerHighlight}>{activeTargetDev?.userName || selectedDevice}</Text>
            </Text>
            <Text style={styles.peerBannerSub}>📡 {t('bluetooth_connected')}</Text>
          </View>

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
              placeholder={`${t('type_message')}`}
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
