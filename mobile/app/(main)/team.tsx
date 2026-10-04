import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDeviceStore } from '../../src/store/deviceStore';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useLanguageStore } from '../../src/i18n';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);

  const devices = useDeviceStore((s) => Object.values(s.devices));
  const activePeopleCount = devices.length;

  return (
    <ErrorBoundary fallbackTitle="People Screen Error">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Responsive Centered Wrapper */}
      <View style={styles.responsiveWrapper}>
        {/* Header with Dynamic Connected People Count */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👥 {t('team_response_team')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('connected_people_count').replace('{count}', String(activePeopleCount))}
          </Text>
        </View>

        <FlatList
          data={devices}
          keyExtractor={(item) => item.deviceId}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.statusDot}>
                    {item.status === 'online' ? '🟢' : '🔴'}
                  </Text>
                  <View style={styles.nameColumn}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.userName || item.deviceName}
                    </Text>
                    <Text style={styles.deviceCode}>
                      {t('person')} ID: {item.deviceId}
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

                <Text style={styles.metaText} numberOfLines={1}>
                  📡 {t('bluetooth_connected')}
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
          )}
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
  }
});
