import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/utils/responsive';
import { initMobileDatabase } from '../src/database/sqlite';
import { BluetoothService } from '../src/services/bluetooth/BluetoothService';
import { LoraPacketParser } from '../src/services/lora/LoraPacketParser';
import { useDeviceStore } from '../src/store/deviceStore';
import { useAuthStore } from '../src/store/authStore';
import { useNetworkStore } from '../src/store/networkStore';
import { saveLocationLocally } from '../src/database/dbQueries';
import { LocationTrackerService } from '../src/services/location/LocationTrackerService';
import {
  useFonts,
  OpenSans_300Light,
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold
} from '@expo-google-fonts/open-sans';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    OpenSans_300Light,
    OpenSans_400Regular,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
    OpenSans_800ExtraBold
  });
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

    const unsubStatus = BluetoothService.getInstance().onStatusChanged((connected) => {
      useNetworkStore.getState().setLoraStatus(connected);
      if (connected) {
        LocationTrackerService.getInstance().broadcastLocationPacket().catch(() => {});
      }
    });

    // Schedule background hardware permissions, tracking and auto-reconnect safely after UI mounts
    const startupTimer = setTimeout(() => {
      BluetoothService.getInstance().requestPermissions().then(() => {
        BluetoothService.getInstance().autoReconnect().then((connected) => {
          if (connected) {
            useNetworkStore.getState().setLoraStatus(true);
            LocationTrackerService.getInstance().broadcastLocationPacket().catch(() => {});
          }
        }).catch((err) =>
          console.warn('[RootLayout] Auto-reconnect notice:', err)
        );
      }).catch((err) =>
        console.warn('[RootLayout] Bluetooth permission request error:', err)
      );

      // Start periodic 5-second location tracking & Bluetooth telemetry broadcasting
      LocationTrackerService.getInstance().startTracking(5000);
    }, 600);

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
        if (sender && sender !== 'User' && sender !== 'Mobile Node' && sender !== 'ESP32 Gateway') {
          useDeviceStore.getState().registerDevice(sender, sender, sender);
        }
      }
    });

    return () => {
      clearTimeout(startupTimer);
      unsubStatus();
      unsubscribe();
    };
  }, []);

  if (!fontsLoaded && Platform.OS !== 'web') {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

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
