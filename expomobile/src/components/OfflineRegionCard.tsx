import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OfflineRegion } from '../services/map/TileCacheManager';
import { Colors, Spacing } from '../utils/responsive';
import { t } from '../i18n';

interface OfflineRegionCardProps {
  region: OfflineRegion;
  onDelete: (id: number) => void;
  onSelect: (region: OfflineRegion) => void;
  isActive: boolean;
}

export const OfflineRegionCard: React.FC<OfflineRegionCardProps> = ({
  region,
  onDelete,
  onSelect,
  isActive
}) => {
  const sizeMB = (region.sizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <View style={[styles.card, isActive && styles.activeCard]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{region.name}</Text>
          <Text style={styles.subtitle}>
            {sizeMB} MB • {region.tileCount} tiles
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>✓ {t('available_offline')}</Text>
        </View>
      </View>

      <Text style={styles.boundsText}>
        Bounds: ({region.minLatitude.toFixed(2)}°, {region.minLongitude.toFixed(2)}°) to ({region.maxLatitude.toFixed(2)}°, {region.maxLongitude.toFixed(2)}°)
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.btn, isActive ? styles.btnActive : styles.btnPrimary]}
          onPress={() => onSelect(region)}
        >
          <Text style={styles.btnText}>
            {isActive ? '✓ Selected Region' : 'Load Offline Map'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnDanger} onPress={() => onDelete(region.id)}>
          <Text style={styles.btnDangerText}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4
  },
  activeCard: {
    borderColor: Colors.accent,
    backgroundColor: '#F0FDF4'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold'
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  statusBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  statusText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700'
  },
  boundsText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: Spacing.md
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 12,
    alignItems: 'center'
  },
  btnPrimary: {
    backgroundColor: Colors.primary
  },
  btnActive: {
    backgroundColor: Colors.accent
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12
  },
  btnDanger: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center'
  },
  btnDangerText: {
    color: Colors.danger,
    fontWeight: 'bold',
    fontSize: 12
  }
});
