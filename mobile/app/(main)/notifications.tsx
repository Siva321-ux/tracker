import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useLanguageStore } from '../../src/i18n';

interface NotificationItem {
  id: string;
  type: 'chat' | 'device' | 'team';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const t = useLanguageStore((s) => s.t);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.responsiveWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔔 {t('notifications')}</Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
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
  markReadText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
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
