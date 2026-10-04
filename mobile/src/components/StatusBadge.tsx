import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../utils/responsive';
import { useLanguageStore } from '../i18n';

interface StatusBadgeProps {
  isOnline: boolean;
  isLoraConnected: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ isOnline, isLoraConnected }) => {
  const t = useLanguageStore((s) => s.t);

  return (
    <View style={styles.container}>
      <View style={[styles.badge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
        <View style={[styles.dot, { backgroundColor: isOnline ? Colors.accent : Colors.danger }]} />
        <Text style={styles.badgeText}>
          {isOnline ? `🟢 ${t('online')}` : `🔴 ${t('offline')}`}
        </Text>
      </View>

      <View style={[styles.badge, isLoraConnected ? styles.onlineBadge : styles.warningBadge]}>
        <View style={[styles.dot, { backgroundColor: isLoraConnected ? Colors.orangeAccent : Colors.warning }]} />
        <Text style={styles.badgeText}>
          {isLoraConnected ? `📡 ${t('lora_active')}` : `⚠️ ${t('lora_disconnected')}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card
  },
  onlineBadge: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E4E7'
  },
  offlineBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  warningBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  badgeText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'OpenSans_700Bold'
  }
});
