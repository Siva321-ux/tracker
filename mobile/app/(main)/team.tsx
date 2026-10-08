import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDeviceStore } from '../../src/store/deviceStore';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useLanguageStore } from '../../src/i18n';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { useNetworkStore } from '../../src/store/networkStore';
import { BluetoothService } from '../../src/services/bluetooth/BluetoothService';
import { BluetoothConnectModal } from '../../src/components/BluetoothConnectModal';
import { useAuthStore } from '../../src/store/authStore';
import { getLocalNodeIdSync } from '../../src/utils/nodeIdentity';

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const currentUser = useAuthStore((s) => s.user);
  const isLoraConnected = useNetworkStore((s) => s.isLoraConnected);
  const btService = BluetoothService.getInstance();
  const connectedBtName = btService.getConnectedDeviceName();
  const selfId = getLocalNodeIdSync();
  const [showBtModal, setShowBtModal] = useState(false);

  const devices = useDeviceStore((s) =>
    Object.values(s.devices).filter((d) => {
      const name = d.userName || d.deviceName || d.deviceId;
      return name !== 'User' && name !== 'ESP32 Gateway' && d.deviceId !== 'User' && d.deviceId !== 'ESP32 Gateway';
    })
  );
  const activePeopleCount = devices.length;

  return (
    <ErrorBoundary fallbackTitle="People Screen Error">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Responsive Centered Wrapper */}
      <View style={styles.responsiveWrapper}>
        {/* Header with Dynamic Connected People Count */}
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={styles.headerTitle}>👥 {t('team_response_team')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('connected_people_count').replace('{count}', String(activePeopleCount))}
            </Text>
          </View>

          {isLoraConnected ? (
            <TouchableOpacity
              style={{ backgroundColor: Colors.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
              onPress={async () => {
                await BluetoothService.getInstance().disconnect();
                useNetworkStore.getState().setLoraStatus(false);
                Alert.alert('Disconnected', 'Bluetooth gateway connection closed.');
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>🔴 Disconnect</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{ backgroundColor: '#F4F5F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder }}
              onPress={() => setShowBtModal(true)}
            >
              <Text style={{ color: Colors.textPrimary, fontSize: 11, fontWeight: 'bold' }}>🔌 Bluetooth</Text>
            </TouchableOpacity>
          )}
        </View>

        <BluetoothConnectModal visible={showBtModal} onClose={() => setShowBtModal(false)} />

        <FlatList
          data={devices}
          keyExtractor={(item) => item.deviceId}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>📡 No Active Connected Nodes</Text>
              <Text style={styles.emptySubText}>
                Connect to an ESP32 or Bluetooth LoRa gateway in the top bar to share location & see field team members.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelf = item.deviceId === selfId || item.deviceId === connectedBtName || (currentUser?.name && item.deviceId === currentUser.name);

            return (
              <View style={styles.memberCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.statusDot}>
                      {item.status === 'online' ? '🟢' : '🔴'}
                    </Text>
                    <View style={styles.nameColumn}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.userName || item.deviceName} {isSelf ? '(You)' : ''}
                      </Text>
                      <Text style={styles.deviceCode}>
                        {t('person')} ID: {item.deviceId} • {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
                      </Text>
                    </View>
                  </View>

                  <View style={styles.batteryTag}>
                    <Text style={styles.batteryText}>🔋 {item.batteryOrValue}%</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText} numberOfLines={1}>
                    ⏱ {t('last_seen')}: {item.lastUpdated}
                  </Text>

                  <Text style={[styles.metaText, isSelf ? { color: '#15803D', fontWeight: 'bold' } : { color: '#0284C7', fontWeight: 'bold' }]} numberOfLines={1}>
                    {isSelf ? '📍 This Device (GPS Active)' : '📡 LoRa Mesh Node'}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtnPrimary}
                    onPress={() => router.push('/map')}
                  >
                    <Text style={styles.actionBtnTextPrimary}>🗺 {t('view_on_map')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => router.push('/chat')}
                  >
                    <Text style={styles.actionBtnTextSecondary}>💬 {t('chat')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>
    </View>
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
  header: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.cardBorder
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'OpenSans_600SemiBold'
  },
  listContainer: {
    padding: Spacing.md
  },
  memberCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1
  },
  statusDot: {
    fontSize: 14
  },
  nameColumn: {
    flex: 1
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  deviceCode: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  batteryTag: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  batteryText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginVertical: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderColor: Colors.cardBorder
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'OpenSans_400Regular'
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 12,
    alignItems: 'center'
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'OpenSans_700Bold'
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 12,
    alignItems: 'center'
  },
  actionBtnTextSecondary: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
    fontFamily: 'OpenSans_600SemiBold'
  },
  emptyBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.cardBorder,
    marginTop: Spacing.md
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold',
    marginBottom: 6
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'OpenSans_400Regular'
  }
});
