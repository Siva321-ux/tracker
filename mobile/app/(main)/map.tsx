import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FieldMapView } from '../../src/components/MapView';
import { StatusBadge } from '../../src/components/StatusBadge';
import { DeviceBottomSheet } from '../../src/components/DeviceBottomSheet';
import { BluetoothConnectModal } from '../../src/components/BluetoothConnectModal';
import { useDeviceStore, DeviceMarker } from '../../src/store/deviceStore';
import { useNetworkStore } from '../../src/store/networkStore';
import { LocationTrackerService } from '../../src/services/location/LocationTrackerService';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useLanguageStore } from '../../src/i18n';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

import { Alert } from 'react-native';
import { BluetoothService } from '../../src/services/bluetooth/BluetoothService';
import { useAuthStore } from '../../src/store/authStore';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);

  const devices = useDeviceStore((s) => s.devices);
  const { isOnline, isLoraConnected } = useNetworkStore();
  const [selectedDevice, setSelectedDevice] = useState<DeviceMarker | null>(null);
  const [showBtModal, setShowBtModal] = useState(false);

  useEffect(() => {
    LocationTrackerService.getInstance().acquireCurrentPosition().then(() => {
      LocationTrackerService.getInstance().broadcastLocationPacket();
    });
  }, []);

  return (
    <ErrorBoundary fallbackTitle="Map View Error">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Field Operations Header Overlay */}
      <View style={styles.topHeader}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowBtModal(true)}>
          <StatusBadge isOnline={isOnline} isLoraConnected={isLoraConnected} />
        </TouchableOpacity>

        <View style={styles.headerBtnGroup}>
          <TouchableOpacity
            style={styles.btBtn}
            onPress={async () => {
              const pos = await LocationTrackerService.getInstance().acquireCurrentPosition();
              await LocationTrackerService.getInstance().broadcastLocationPacket();
              Alert.alert('📍 Position & Battery Refreshed', `Latitude: ${pos.latitude.toFixed(4)}°\nLongitude: ${pos.longitude.toFixed(4)}°`);
            }}
          >
            <Text style={styles.btBtnText}>📍 My Pin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btBtn} onPress={() => setShowBtModal(true)}>
            <Text style={styles.btBtnText}>🔌 Bluetooth</Text>
          </TouchableOpacity>

          {isLoraConnected && (
            <TouchableOpacity
              style={[styles.btBtn, { backgroundColor: Colors.danger }]}
              onPress={async () => {
                await BluetoothService.getInstance().disconnect();
                useNetworkStore.getState().setLoraStatus(false);
                Alert.alert('Disconnected', 'Bluetooth gateway connection closed.');
              }}
            >
              <Text style={[styles.btBtnText, { color: '#FFFFFF' }]}>🔴 Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Field Map */}
      <FieldMapView
        devices={devices}
        onSelectDevice={(dev) => setSelectedDevice(dev)}
        isOfflineMapActive={!isOnline}
      />

      {/* Selected Device Details Bottom Sheet */}
      <DeviceBottomSheet
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
        onOpenChat={(userName) => {
          setSelectedDevice(null);
          router.push('/chat');
        }}
        onCenterMap={(lat, lon) => {
          console.log(`Centered map on ${lat}, ${lon}`);
        }}
      />

      {/* Interactive Bluetooth Gateway Scanner Modal */}
      <BluetoothConnectModal
        visible={showBtModal}
        onClose={() => setShowBtModal(false)}
      />
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.sm,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 3
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs + 4
  },
  btBtn: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder
  },
  btBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  }
});
