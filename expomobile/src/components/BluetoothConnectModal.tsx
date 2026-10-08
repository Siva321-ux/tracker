import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { BluetoothService, BluetoothDevice } from '../services/bluetooth/BluetoothService';
import { useNetworkStore } from '../store/networkStore';
import { useDeviceStore } from '../store/deviceStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { Colors, Spacing } from '../utils/responsive';
import { useLanguageStore } from '../i18n';

interface BluetoothConnectModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BluetoothConnectModal: React.FC<BluetoothConnectModalProps> = ({ visible, onClose }) => {
  const t = useLanguageStore((s) => s.t);
  const setLoraStatus = useNetworkStore((s) => s.setLoraStatus);
  const { user, setAuth } = useAuthStore();

  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(
    BluetoothService.getInstance().getConnectedDeviceId()
  );

  // Post-connection Name Prompt state
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(false);
  const [connectedDevObj, setConnectedDevObj] = useState<BluetoothDevice | null>(null);
  const [inputName, setInputName] = useState<string>('');

  const btService = BluetoothService.getInstance();

  useEffect(() => {
    if (visible) {
      handleScan();
    }
  }, [visible]);

  const handleScan = async () => {
    setIsScanning(true);
    setDevices([]);
    try {
      const list = await btService.scanDevices();
      setDevices(list);
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (dev: BluetoothDevice) => {
    setConnectingId(dev.id);
    try {
      const success = await btService.connect(dev.id);
      if (success) {
        setConnectedDeviceId(dev.id);
        setLoraStatus(true);
        setConnectedDevObj(dev);

        const initialName =
          dev.name && !dev.name.includes('Gateway') && !dev.name.includes('Device')
            ? dev.name.split(' ')[0].trim()
            : user?.name || 'JESS';

        setInputName(initialName);
        setShowNamePrompt(true);
      }
    } catch (err: any) {
      Alert.alert('Connection Error', err.message || 'Unable to connect to Bluetooth device');
    } finally {
      setConnectingId(null);
    }
  };

  const handleSaveNameAndActivate = async (customName?: string) => {
    const finalName = (customName !== undefined ? customName : inputName).trim() || user?.name || 'JESS';

    // 1. Set Bluetooth service connected device name
    btService.setConnectedDeviceName(finalName);

    // 2. Set auth profile name
    setAuth(
      {
        id: user?.id || Date.now(),
        name: finalName,
        email: user?.email || `${finalName.toLowerCase()}@mesh.node`,
        language: user?.language || 'en',
        status: 'online'
      },
      'mesh-token-123'
    );

    // 3. Send LOC handshake over Bluetooth to ESP32 / Radio Gateway
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const locHandshake = `LOC,${finalName},13.0827,80.2707,${timeStr},100`;
    try {
      await btService.sendData(locHandshake);
    } catch (e) {
      console.log('Telemetry handshake notice:', e);
    }

    // 4. Register node in deviceStore
    useDeviceStore.getState().updateDeviceLocation(
      finalName,
      13.0827,
      80.2707,
      timeStr,
      100,
      finalName,
      finalName
    );

    useNotificationStore.getState().addNotification(
      'device',
      '🔌 Gateway Connected',
      `Connected to Bluetooth Radio "${finalName}". Data sharing active!`
    );

    setShowNamePrompt(false);
    Alert.alert('✓ Bluetooth Connected', `Connected to "${finalName}". Radio mesh data sharing active!`, [
      { text: 'OK', onPress: () => onClose() }
    ]);
  };

  const handleDisconnect = async () => {
    await btService.disconnect();
    setConnectedDeviceId(null);
    setConnectedDevObj(null);
    setShowNamePrompt(false);
    setLoraStatus(false);
    
    // Purge devices & reset auth store on disconnect
    useDeviceStore.getState().clearDevices();
    useAuthStore.getState().logout();

    useNotificationStore.getState().addNotification(
      'device',
      '🔌 Gateway Disconnected',
      'Bluetooth gateway radio connection closed.'
    );
    Alert.alert('Disconnected', 'Bluetooth gateway connection closed.');
  };

  const rawDevName = btService.getConnectedDeviceName();
  const isRawBase64 = connectedDeviceId && (connectedDeviceId.includes('=') || connectedDeviceId.length > 20);
  const cleanDevId = isRawBase64 ? 'ESP32 Gateway' : connectedDeviceId;
  const displayGatewayName =
    rawDevName && rawDevName !== 'ESP32 Gateway'
      ? rawDevName
      : user?.name
      ? `ESP32 Gateway (${user.name})`
      : cleanDevId || 'ESP32 LoRa Gateway';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>🔌 Connect Bluetooth LoRa Gateway</Text>
              <Text style={styles.modalSubTitle}>
                {connectedDeviceId
                  ? `Connected to ${displayGatewayName}`
                  : 'Select an ESP32 or Heltec Bluetooth Gateway to receive live field telemetry'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Active Connection Banner */}
          {connectedDeviceId && (
            <View style={styles.connectedBanner}>
              <View style={styles.connectedInfo}>
                <Text style={styles.connectedTitle}>🟢 Gateway Active</Text>
                <Text style={styles.connectedSub}>{displayGatewayName} • Protocol: LOC & CHAT Packets</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.disconnectBtn, { backgroundColor: '#2563EB' }]}
                  onPress={() => {
                    setInputName(rawDevName || user?.name || 'JESS');
                    setShowNamePrompt(true);
                  }}
                >
                  <Text style={styles.disconnectBtnText}>✏️ Edit Name</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                  <Text style={styles.disconnectBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Post-Connection Name Entry Prompt */}
          {showNamePrompt ? (
            <View style={styles.postConnectCard}>
              <Text style={styles.postConnectBadge}>🟢 Bluetooth Connected!</Text>
              <Text style={styles.postConnectTitle}>Enter Device / Call Sign Name</Text>
              <Text style={styles.postConnectSub}>
                Connected to Bluetooth hardware ({connectedDevObj?.name || connectedDevObj?.id || displayGatewayName}). Enter the device call sign name to show on field maps & chat:
              </Text>
              <View style={styles.callSignInputRow}>
                <TextInput
                  style={styles.callSignInput}
                  value={inputName}
                  onChangeText={setInputName}
                  placeholder="Enter Call Sign / Device Name (e.g. THANU, JESS)"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.saveCallSignBtn}
                  onPress={() => handleSaveNameAndActivate()}
                >
                  <Text style={styles.saveCallSignText}>Set Name & Connect ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Permission Prompt Banner */}
              <TouchableOpacity
                style={styles.permissionBanner}
                onPress={async () => {
                  const ok = await btService.requestPermissions();
                  if (ok) {
                    Alert.alert('✓ Permissions Granted', 'Bluetooth Scan & Location permissions enabled.');
                    handleScan();
                  } else {
                    Alert.alert('Permission Required', 'Please allow Bluetooth and Location permissions in phone Settings.');
                  }
                }}
              >
                <Text style={styles.permissionBannerText}>🔑 Grant Mobile Bluetooth & Location Permissions ➔</Text>
              </TouchableOpacity>

              {/* Scan Action Row */}
              <View style={styles.scanRow}>
                <Text style={styles.sectionLabel}>Available Bluetooth Devices ({devices.length}):</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.rescanBtn, { backgroundColor: Colors.primary }]}
                    onPress={async () => {
                      setIsScanning(true);
                      try {
                        const hwDev = await btService.scanHardwareWebBluetooth();
                        if (hwDev) {
                          setDevices((prev) => [hwDev, ...prev.filter((d) => d.id !== hwDev.id)]);
                        }
                      } catch (e) {}
                      setIsScanning(false);
                    }}
                  >
                    <Text style={[styles.rescanBtnText, { color: '#FFFFFF' }]}>🔍 Hardware Scan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.rescanBtn} onPress={handleScan} disabled={isScanning}>
                    <Text style={styles.rescanBtnText}>{isScanning ? 'Scanning...' : '🔄 Rescan'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Devices List */}
              {isScanning ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#18181B" />
                  <Text style={styles.loadingText}>Scanning for nearby LoRa Bluetooth gateways...</Text>
                </View>
              ) : (
                <FlatList
                  data={devices}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.deviceList}
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyTitle}>📡 No Bluetooth Devices Found</Text>
                      <Text style={styles.emptySubText}>
                        Ensure your ESP32 or Heltec LoRa gateway is powered ON and Bluetooth is active.
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const isCurrent = connectedDeviceId === item.id;
                    const isConnectingThis = connectingId === item.id;
                    const itemDisplayName = item.name || item.id || 'Bluetooth Device';
                    const itemMetaId = item.id;

                    return (
                      <View style={[styles.deviceCard, isCurrent && styles.deviceCardActive]}>
                        <View style={styles.deviceInfo}>
                          <Text style={styles.deviceName}>📡 {itemDisplayName}</Text>
                          <Text style={styles.deviceMeta}>
                            ID: {itemMetaId} • Signal: {item.rssi || -70} dBm
                          </Text>
                        </View>

                        {isCurrent ? (
                          <View style={styles.activeTag}>
                            <Text style={styles.activeTagText}>✓ Connected</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.connectBtn}
                            onPress={() => handleConnect(item)}
                            disabled={isConnectingThis}
                          >
                            <Text style={styles.connectBtnText}>
                              {isConnectingThis ? 'Connecting...' : 'Connect'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.md + 4,
    maxHeight: '80%'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  modalSubTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold'
  },
  connectedBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  connectedInfo: {
    flex: 1
  },
  connectedTitle: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  connectedSub: {
    color: '#166534',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  disconnectBtn: {
    backgroundColor: Colors.danger,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 12
  },
  disconnectBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  scanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'OpenSans_700Bold'
  },
  rescanBtn: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder
  },
  rescanBtnText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'OpenSans_600SemiBold'
  },
  loadingBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular'
  },
  deviceList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md
  },
  deviceCard: {
    backgroundColor: '#F4F5F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  deviceCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC'
  },
  deviceInfo: {
    flex: 1
  },
  deviceName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  deviceMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  connectBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 4,
    borderRadius: 12
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  activeTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 12
  },
  activeTagText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  emptyBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F5F7',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.cardBorder,
    marginTop: Spacing.xs
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold',
    marginBottom: 4
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'OpenSans_400Regular'
  },
  callSignCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  callSignTitle: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  callSignSub: {
    color: '#1E3A8A',
    fontSize: 11,
    marginTop: 2,
    marginBottom: Spacing.sm,
    fontFamily: 'OpenSans_400Regular'
  },
  callSignInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center'
  },
  callSignInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    color: Colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    fontFamily: 'OpenSans_600SemiBold'
  },
  permissionBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 14,
    paddingVertical: Spacing.xs + 4,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  permissionBannerText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  saveCallSignBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveCallSignText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'OpenSans_700Bold'
  },
  postConnectCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md
  },
  postConnectBadge: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold',
    marginBottom: 4
  },
  postConnectTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold',
    marginBottom: 4
  },
  postConnectSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    marginBottom: Spacing.sm
  }
});
