import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { BluetoothService, BluetoothDevice } from '../services/bluetooth/BluetoothService';
import { useNetworkStore } from '../store/networkStore';
import { Colors, Spacing } from '../utils/responsive';
import { useLanguageStore } from '../i18n';

interface BluetoothConnectModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BluetoothConnectModal: React.FC<BluetoothConnectModalProps> = ({ visible, onClose }) => {
  const t = useLanguageStore((s) => s.t);
  const setLoraStatus = useNetworkStore((s) => s.setLoraStatus);

  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(
    BluetoothService.getInstance().getConnectedDeviceId()
  );

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
        Alert.alert('✓ Gateway Connected', `Successfully connected to ${dev.name} over Bluetooth Serial SPP.`);
      }
    } catch (err: any) {
      Alert.alert('Connection Error', err.message);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async () => {
    await btService.disconnect();
    setConnectedDeviceId(null);
    setLoraStatus(false);
    Alert.alert('Disconnected', 'Bluetooth gateway connection closed.');
  };

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
                  ? `Connected to ${connectedDeviceId}`
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
                <Text style={styles.connectedSub}>{connectedDeviceId} • Protocol: LOC & CHAT Packets</Text>
              </View>
              <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                <Text style={styles.disconnectBtnText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scan Action Row */}
          <View style={styles.scanRow}>
            <Text style={styles.sectionLabel}>Available Bluetooth Devices ({devices.length}):</Text>
            <TouchableOpacity style={styles.rescanBtn} onPress={handleScan} disabled={isScanning}>
              <Text style={styles.rescanBtnText}>{isScanning ? 'Scanning...' : '🔄 Rescan'}</Text>
            </TouchableOpacity>
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
              renderItem={({ item }) => {
                const isCurrent = connectedDeviceId === item.id;
                const isConnectingThis = connectingId === item.id;

                return (
                  <View style={[styles.deviceCard, isCurrent && styles.deviceCardActive]}>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>📡 {item.name}</Text>
                      <Text style={styles.deviceMeta}>
                        ID: {item.id} • Signal: {item.rssi || -70} dBm
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
  }
});
