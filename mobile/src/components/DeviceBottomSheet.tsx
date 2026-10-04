import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { DeviceMarker, useDeviceStore } from '../store/deviceStore';
import { Colors, Spacing } from '../utils/responsive';
import { useLanguageStore } from '../i18n';

interface DeviceBottomSheetProps {
  device: DeviceMarker | null;
  onClose: () => void;
  onOpenChat: (userName: string) => void;
  onCenterMap: (lat: number, lon: number) => void;
}

export const DeviceBottomSheet: React.FC<DeviceBottomSheetProps> = ({
  device,
  onClose,
  onOpenChat,
  onCenterMap
}) => {
  if (!device) return null;

  const t = useLanguageStore((s) => s.t);
  const setCustomDeviceName = useDeviceStore((s) => s.setCustomDeviceName);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(device.userName || device.deviceName || device.deviceId);

  const handleSaveName = () => {
    if (editName.trim()) {
      setCustomDeviceName(device.deviceId, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <View style={styles.sheetContainer}>
      <View style={styles.headerRow}>
        {isEditing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder={t('enter_person_name')}
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName}>
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.titleGroup}>
            <View style={styles.nameHeaderRow}>
              <Text style={styles.deviceCode}>📍 {device.deviceId}</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Text style={styles.editBtnText}>✏️ {t('edit_name')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{device.userName || device.deviceName}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>{t('latitude')}</Text>
          <Text style={styles.value}>{device.latitude.toFixed(6)}° N</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.label}>{t('longitude')}</Text>
          <Text style={styles.value}>{device.longitude.toFixed(6)}° E</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.label}>{t('last_updated')}</Text>
          <Text style={styles.value}>{device.lastUpdated}</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.label}>{t('battery_telemetry')}</Text>
          <Text style={styles.accentValue}>🔋 {device.batteryOrValue}%</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => onOpenChat(device.userName || device.deviceId)}
        >
          <Text style={styles.btnTextPrimary}>💬 {t('open_private_chat')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => onCenterMap(device.latitude, device.longitude)}
        >
          <Text style={styles.btnTextSecondary}>🎯 {t('center_on_map')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 900,
    alignSelf: 'center',
    backgroundColor: Colors.cardDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.cardDarkBorder,
    padding: Spacing.md + 4,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  titleGroup: {
    flexDirection: 'column',
    flex: 1
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  deviceCode: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  editBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: 10
  },
  editBtnText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'OpenSans_600SemiBold'
  },
  userName: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: 'OpenSans_600SemiBold'
  },
  editRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#27272A',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#3F3F46',
    fontFamily: 'OpenSans_400Regular'
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
    justifyContent: 'center'
  },
  saveBtnText: {
    color: '#09090B',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'OpenSans_700Bold'
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md
  },
  gridItem: {
    width: '50%',
    marginBottom: Spacing.sm
  },
  label: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'OpenSans_400Regular'
  },
  value: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: 'OpenSans_600SemiBold'
  },
  accentValue: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
    fontFamily: 'OpenSans_700Bold'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPrimary: {
    backgroundColor: Colors.accent
  },
  btnSecondary: {
    backgroundColor: '#27272A'
  },
  btnTextPrimary: {
    color: '#09090B',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'OpenSans_700Bold'
  },
  btnTextSecondary: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'OpenSans_600SemiBold'
  }
});
