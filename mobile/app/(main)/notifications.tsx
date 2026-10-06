import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationStore } from '../../src/store/notificationStore';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useLanguageStore } from '../../src/i18n';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const t = useLanguageStore((s) => s.t);

  const notifications = useNotificationStore((s) => s.notifications);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearNotifications = useNotificationStore((s) => s.clearNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ErrorBoundary fallbackTitle="Notifications Screen Error">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.responsiveWrapper}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>🔔 {t('notifications')}</Text>
              <Text style={styles.headerSubtitle}>
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </Text>
            </View>
            <View style={styles.actionHeaderBtns}>
              {unreadCount > 0 && (
                <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
                  <Text style={styles.markReadText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearNotifications}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>🔕 No Notifications Yet</Text>
                <Text style={styles.emptySubText}>
                  Incoming chat broadcasts, private messages, and gateway connection events will appear here.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.card, !item.read && styles.unreadCard]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.time}>{item.time}</Text>
                </View>
                <Text style={styles.message}>{item.message}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md + 4,
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
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  actionHeaderBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center'
  },
  markReadBtn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 12
  },
  markReadText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  clearBtn: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder
  },
  clearText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
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
    lineHeight: 18,
    fontFamily: 'OpenSans_400Regular'
  },
  listContainer: {
    padding: Spacing.md
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md + 2,
    marginBottom: Spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4
  },
  unreadCard: {
    borderColor: Colors.accent,
    backgroundColor: '#F0FDF4'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  time: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: 'OpenSans_400Regular'
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular'
  }
});
