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

    const unsubscribe = BluetoothService.getInstance().onDataReceived((rawPacket) => {
      const parsed = LoraPacketParser.parse(rawPacket);
      if (parsed && parsed.type === 'LOC') {
        const { deviceId, latitude, longitude, time, value } = parsed;
        useDeviceStore.getState().updateDeviceLocation(deviceId, latitude, longitude, time, value);
        saveLocationLocally(deviceId, latitude, longitude, value, time).catch((err) =>
          console.error('Failed to save packet to SQLite:', err)
        );
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
