import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initMobileDatabase } from '../src/database/sqlite';
import { BluetoothService } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import { useDeviceStore } from '../src/store/deviceStore';
import { saveLocationLocally } from '../src/database/dbQueries';
import { LocationTrackerService } from '../src/services/location/LocationTrackerService';
import { Colors } from '../src/utils/responsive';

export default function RootLayout() {
  useEffect(() => {
    // Inject Open Sans Google Font for Web platform
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);

      const style = document.createElement('style');
      style.textContent = `
        * {
          font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
      `;
      document.head.appendChild(style);
    }

    initMobileDatabase().catch((err) => console.error('Mobile DB init error:', err));

    // Request native Bluetooth & Location runtime permissions on mobile launch
    BluetoothService.getInstance().requestPermissions().catch((err) =>
      console.warn('[RootLayout] Bluetooth permission request error:', err)
    );

    // Start automatic location tracking & Bluetooth telemetry broadcasting
    LocationTrackerService.getInstance().startTracking(10000);

    const unsubscribe = BluetoothService.getInstance().onDataReceived((rawPacket) => {
      const parsed = LoraPacketParser.parse(rawPacket);
      if (!parsed) return;

      if (parsed.type === 'LOC') {
        const { deviceId, latitude, longitude, time, value } = parsed;
        useDeviceStore.getState().updateDeviceLocation(deviceId, latitude, longitude, time, value, deviceId, deviceId);
        saveLocationLocally(deviceId, latitude, longitude, value, time).catch((err) =>
          console.error('Failed to save packet to SQLite:', err)
        );
      } else if (parsed.type === 'CHAT' || parsed.type === 'PUBLIC') {
        const sender = parsed.senderId;
        if (sender) {
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          useDeviceStore.getState().updateDeviceLocation(sender, 13.0827, 80.2707, timeStr, 100, sender, sender);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background }
        }}
      >
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
      </Stack>
    </SafeAreaProvider>
  );
}
