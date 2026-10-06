import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { BluetoothService } from '../bluetooth/BluetoothService';
import { useDeviceStore } from '../../store/deviceStore';
import { useAuthStore } from '../../store/authStore';
import { saveLocationLocally } from '../../database/dbQueries';

export class LocationTrackerService {
  private static instance: LocationTrackerService;
  private trackingInterval: any = null;
  private currentLat: number = 13.0827; // Default Chennai base coords
  private currentLon: number = 80.2707;
  private isTracking: boolean = false;
  private locationSubscription: any = null;

  private constructor() {}

  public static getInstance(): LocationTrackerService {
    if (!LocationTrackerService.instance) {
      LocationTrackerService.instance = new LocationTrackerService();
    }
    return LocationTrackerService.instance;
  }

  /**
   * Starts periodic GPS location tracking & automatic Bluetooth LOC broadcasting
   */
  public async startTracking(intervalMs: number = 10000): Promise<void> {
    if (this.isTracking) return;
    this.isTracking = true;

    console.log('[LocationTrackerService] Starting automatic GPS & Bluetooth telemetry broadcasting...');

    // Request native Expo Location permissions
    await this.requestLocationPermissions();

    // 1. Fetch initial position
    await this.acquireCurrentPosition();

    // 2. Set up periodic location update & Bluetooth broadcast loop
    this.trackingInterval = setInterval(async () => {
      await this.acquireCurrentPosition();
      await this.broadcastLocationPacket();
    }, intervalMs);
  }

  public stopTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    if (this.locationSubscription && this.locationSubscription.remove) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
    console.log('[LocationTrackerService] Location tracking stopped.');
  }

  private async requestLocationPermissions(): Promise<boolean> {
    try {
      if (Location && Location.requestForegroundPermissionsAsync) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log(`[LocationTrackerService] Expo Location Permission Status: ${status}`);
        return status === 'granted';
      }
    } catch (e: any) {
      console.warn('[LocationTrackerService] Permission request warning:', e?.message);
    }
    return false;
  }

  /**
   * Acquires live hardware GPS coordinates from Expo Location or Browser Geolocation API
   */
  public async acquireCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    // 1. Try Expo Location native GPS chip
    try {
      if (Location) {
        // Try fast last known position first
        if (Location.getLastKnownPositionAsync) {
          const lastPos = await Location.getLastKnownPositionAsync();
          if (lastPos && lastPos.coords) {
            this.currentLat = lastPos.coords.latitude;
            this.currentLon = lastPos.coords.longitude;
          }
        }
        // Then query high-accuracy current position
        if (Location.getCurrentPositionAsync) {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy?.Balanced || 3,
          });
          if (pos && pos.coords) {
            this.currentLat = pos.coords.latitude;
            this.currentLon = pos.coords.longitude;
            console.log(`[LocationTrackerService] Live Native GPS: Lat=${this.currentLat}, Lon=${this.currentLon}`);
          }
        }
        return { latitude: this.currentLat, longitude: this.currentLon };
      }
    } catch (err: any) {
      console.warn('[LocationTrackerService] Expo native location fetch notice:', err?.message);
    }

    // 2. Fallback to Web Geolocation API
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentLat = pos.coords.latitude;
          this.currentLon = pos.coords.longitude;
        },
        (err) => {
          console.warn('[LocationTrackerService] Web Geolocation fetch notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    }

    return { latitude: this.currentLat, longitude: this.currentLon };
  }

  /**
   * Acquires real hardware battery percentage from device API (Expo Battery / Web Battery)
   */
  private async acquireBatteryLevel(): Promise<number> {
    try {
      if (Battery && Battery.getBatteryLevelAsync) {
        const level = await Battery.getBatteryLevelAsync();
        if (typeof level === 'number' && level >= 0) {
          const pct = Math.round(level * 100);
          console.log(`[LocationTrackerService] Native Mobile Battery Level: ${pct}%`);
          return pct;
        }
      }
    } catch (e: any) {
      console.warn('[LocationTrackerService] Native Expo Battery API warning:', e?.message);
    }

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
        const bat = await (navigator as any).getBattery();
        if (bat && typeof bat.level === 'number') {
          return Math.round(bat.level * 100);
        }
      }
    } catch (e) {
      console.warn('[LocationTrackerService] Web Battery API notice:', e);
    }
    return 100;
  }

  /**
   * Formats location & battery telemetry, updates map pins, and transmits over Bluetooth
   */
  public async broadcastLocationPacket(): Promise<void> {
    const btService = BluetoothService.getInstance();
    const isConnected = btService.isConnected();

    // If Bluetooth is NOT connected, do NOT create ghost map pins
    if (!isConnected) {
      console.log('[LocationTrackerService] Bluetooth disconnected. Skipping map pin update.');
      return;
    }

    const connectedNode = btService.getConnectedDeviceName();
    const user = useAuthStore.getState().user;
    const deviceId = connectedNode || user?.name || 'ESP32 Gateway';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const battery = await this.acquireBatteryLevel();

    // 1. Update local deviceStore map pin & SQLite DB
    useDeviceStore.getState().updateDeviceLocation(
      deviceId,
      this.currentLat,
      this.currentLon,
      timeStr,
      battery,
      deviceId,
      deviceId
    );

    saveLocationLocally(deviceId, this.currentLat, this.currentLon, battery, timeStr).catch((err) =>
      console.error('[LocationTrackerService] Error saving location locally:', err)
    );

    // 2. Broadcast over Bluetooth hardware stream
    const locPacket = `LOC,${deviceId},${this.currentLat.toFixed(4)},${this.currentLon.toFixed(4)},${timeStr},${battery}`;
    console.log(`[LocationTrackerService] Transmitting auto-location packet over Bluetooth: "${locPacket}"`);
    await btService.sendData(locPacket);
  }
}
