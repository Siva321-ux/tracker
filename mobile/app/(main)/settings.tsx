import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguageStore } from '../../src/i18n';
import { LoraSimulator } from '../../src/services/lora/LoraSimulator';
import { BluetoothService } from '../../src/services/bluetooth/BluetoothService';
import { BluetoothConnectModal } from '../../src/components/BluetoothConnectModal';
import { SyncManager } from '../../src/services/sync/SyncManager';
import { useAuthStore } from '../../src/store/authStore';
import { useNetworkStore } from '../../src/store/networkStore';
import { Colors, Spacing } from '../../src/utils/responsive';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguageStore();
  const { user, updateUserName } = useAuthStore();

  const [editName, setEditName] = useState(user?.name || 'Field User');
  const [isEditing, setIsEditing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(LoraSimulator.getInstance().isSimulating());
  const [isBtConnected, setIsBtConnected] = useState(BluetoothService.getInstance().isConnected());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBtModal, setShowBtModal] = useState(false);

  React.useEffect(() => {
    setIsBtConnected(BluetoothService.getInstance().isConnected());
    const unsub = BluetoothService.getInstance().onStatusChanged((connected) => {
      setIsBtConnected(connected);
    });
    return () => unsub();
  }, []);

  const handleSaveName = () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'User name cannot be empty.');
      return;
    }
    updateUserName(editName.trim());
    setIsEditing(false);
    Alert.alert('Profile Updated', `User name updated to "${editName.trim()}"`);
  };

  const handleToggleSimulator = () => {
    const sim = LoraSimulator.getInstance();
    if (sim.isSimulating()) {
      sim.stopSimulation();
      setIsSimulating(false);
    } else {
      sim.startSimulation(2500);
      setIsSimulating(true);
      Alert.alert('Simulator Started', 'Sending LoRa telemetry data LOC,dev1,28.6050,77.3700,12:02:00,88 over Bluetooth!');
    }
  };

  const handleConnectBluetooth = async () => {
    const bt = BluetoothService.getInstance();
    if (bt.isConnected()) {
      await bt.disconnect();
      setIsBtConnected(false);
    } else {
      await bt.connect('lora-gw-01');
      setIsBtConnected(true);
      Alert.alert('Bluetooth Connected', 'Connected to ESP32 LoRa Gateway over Bluetooth');
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await SyncManager.getInstance().syncPendingQueue();
    setIsSyncing(false);
    Alert.alert('Sync Complete', `Synchronized ${res.syncedCount} pending offline items with backend server.`);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.responsiveWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ {t('settings_title')}</Text>
        </View>

        {/* Editable User Name Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 {t('profile')} & {t('person_name')}</Text>
          
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
            <View style={styles.profileRow}>
              <View>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>

              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Text style={styles.editBtnText}>✏️ {t('edit_name')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tamil & English Language Switcher */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🌐 {t('select_language')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
                English 🇬🇧
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langBtn, language === 'ta' && styles.langBtnActive]}
              onPress={() => setLanguage('ta')}
            >
              <Text style={[styles.langText, language === 'ta' && styles.langTextActive]}>
                தமிழ் (Tamil) 🇮🇳
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bluetooth & LoRa Data Link */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔌 Bluetooth Gateway & Telemetry</Text>
          <Text style={styles.infoText}>Format: LOC,dev1,28.6050,77.3700,12:02:00,88</Text>

          <TouchableOpacity
            style={[styles.actionBtn, isBtConnected ? styles.btnSuccess : styles.btnSecondary, { marginTop: Spacing.sm }]}
            onPress={() => setShowBtModal(true)}
          >
            <Text style={isBtConnected ? styles.actionBtnText : styles.actionBtnTextSecondary}>
              {isBtConnected ? `✓ ${t('bluetooth_connected')}` : `🔌 ${t('connect_bluetooth')}`}
            </Text>
          </TouchableOpacity>

          {isBtConnected && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnDanger, { marginTop: Spacing.sm }]}
              onPress={async () => {
                await BluetoothService.getInstance().disconnect();
                setIsBtConnected(false);
                useNetworkStore.getState().setLoraStatus(false);
                Alert.alert('Disconnected', 'Bluetooth gateway connection closed and session cleared.');
              }}
            >
              <Text style={styles.actionBtnText}>🔴 Disconnect Bluetooth</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, isSimulating ? styles.btnDanger : styles.btnPrimary, { marginTop: Spacing.sm }]}
            onPress={handleToggleSimulator}
          >
            <Text style={styles.actionBtnText}>
              {isSimulating ? `⏹ ${t('stop_simulator')}` : `▶ ${t('start_simulator')}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Manual Data Sync */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔄 Offline Data Synchronization</Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPrimary]}
            onPress={handleManualSync}
            disabled={isSyncing}
          >
            <Text style={styles.actionBtnText}>
              {isSyncing ? 'Syncing...' : `🚀 ${t('sync_now')}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <BluetoothConnectModal visible={showBtModal} onClose={() => setShowBtModal(false)} />
    </ScrollView>
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
    alignSelf: 'center',
    paddingBottom: Spacing.xl
  },
  header: {
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
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md + 2,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    fontFamily: 'OpenSans_700Bold'
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  profileName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  profileEmail: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'OpenSans_400Regular'
  },
  editBtn: {
    backgroundColor: '#F4F5F7',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 12
  },
  editBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'OpenSans_600SemiBold'
  },
  editRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center'
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    color: Colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    fontFamily: 'OpenSans_400Regular'
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12
  },
  saveBtnText: {
    color: '#09090B',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'OpenSans_700Bold'
  },
  infoText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
    fontFamily: 'OpenSans_400Regular'
  },
  langRow: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  langBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: '#F4F5F7',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center'
  },
  langBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#18181B'
  },
  langText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'OpenSans_600SemiBold'
  },
  langTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold'
  },
  actionBtn: {
    paddingVertical: Spacing.sm + 4,
    borderRadius: 14,
    alignItems: 'center'
  },
  btnPrimary: {
    backgroundColor: Colors.primary
  },
  btnSecondary: {
    backgroundColor: '#F4F5F7',
    borderWidth: 1,
    borderColor: Colors.cardBorder
  },
  btnSuccess: {
    backgroundColor: Colors.accent
  },
  btnDanger: {
    backgroundColor: Colors.danger
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'OpenSans_700Bold'
  },
  actionBtnTextSecondary: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'OpenSans_700Bold'
  }
});
