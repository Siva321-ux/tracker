let Platform: any = { OS: 'web' };
try {
  Platform = require('react-native').Platform || Platform;
} catch (e) {
  Platform = { OS: 'web' };
}
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { BluetoothService } from '../bluetooth/BluetoothService';
import { useDeviceStore } from '../../store/deviceStore';
import { useAuthStore } from '../../store/authStore';
import { saveLocationLocally } from '../../database/dbQueries';
import { getLocalNodeIdAsync, getLocalNodeIdSync } from '../../utils/nodeIdentity';

export class LocationTrackerService {
  private static instance: LocationTrackerService;
  private trackingInterval: any = null;
  private currentLat: number = 11.5034; // Sathy/Tamil Nadu field base coords
  private currentLon: number = 77.2444;
  private currentBattery: number = 95;
  private isTracking: boolean = false;
  private locationSubscription: any = null;
  private hasAcquiredRealGps: boolean = false;

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
  public async startTracking(intervalMs: number = 5000): Promise<void> {
    if (this.isTracking) {
      this.broadcastLocationPacket().catch(() => {});
      return;
    }
    this.isTracking = true;

    console.log('[LocationTrackerService] Starting automatic GPS & Bluetooth telemetry tracking...');

    await this.requestLocationPermissions();
    await this.acquireCurrentPosition();
    await this.broadcastLocationPacket();

    // Start native location position stream if available
    try {
      if (Location && Location.watchPositionAsync) {
        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 2
          },
          (pos) => {
            if (pos && pos.coords) {
              this.currentLat = pos.coords.latitude;
              this.currentLon = pos.coords.longitude;
              this.hasAcquiredRealGps = true;
            }
          }
        );
      }
    } catch (e: any) {
      console.warn('[LocationTrackerService] Location watcher notice:', e?.message);
    }

    this.trackingInterval = setInterval(async () => {
      try {
        await this.broadcastLocationPacket();
      } catch (err) {
        console.warn('[LocationTrackerService] Interval broadcast error:', err);
      }
    }, intervalMs);
  }

  public stopTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    if (this.locationSubscription && this.locationSubscription.remove) {
      try {
        this.locationSubscription.remove();
      } catch (_) {}
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
    if (this.hasAcquiredRealGps) {
      return { latitude: this.currentLat, longitude: this.currentLon };
    }

    try {
      if (Location) {
        // First check last known position for immediate accuracy
        if (Location.getLastKnownPositionAsync) {
          try {
            const lastPos = await Location.getLastKnownPositionAsync();
            if (lastPos && lastPos.coords) {
              this.currentLat = lastPos.coords.latitude;
              this.currentLon = lastPos.coords.longitude;
              this.hasAcquiredRealGps = true;
              return { latitude: this.currentLat, longitude: this.currentLon };
            }
          } catch (_) {}
        }

        // Fetch precise current GPS fix with fast 2.5s timeout
        if (Location.getCurrentPositionAsync) {
          try {
            const posPromise = Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy?.High || Location.Accuracy?.Balanced || 3,
            });
            const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 2500));
            const pos: any = await Promise.race([posPromise, timeoutPromise]);
            if (pos && pos.coords) {
              this.currentLat = pos.coords.latitude;
              this.currentLon = pos.coords.longitude;
              this.hasAcquiredRealGps = true;
              console.log(`[LocationTrackerService] Live Native GPS: Lat=${this.currentLat}, Lon=${this.currentLon}`);
              return { latitude: this.currentLat, longitude: this.currentLon };
            }
          } catch (e: any) {
            console.warn('[LocationTrackerService] Position fetch warning:', e?.message);
          }
        }
      }
    } catch (err: any) {
      console.warn('[LocationTrackerService] Expo native location fetch notice:', err?.message);
    }

    // Fallback to Web Geolocation API
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (pos && pos.coords) {
              this.currentLat = pos.coords.latitude;
              this.currentLon = pos.coords.longitude;
              this.hasAcquiredRealGps = true;
            }
            resolve();
          },
          (err) => {
            resolve();
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 }
        );
      });
    }

    return { latitude: this.currentLat, longitude: this.currentLon };
  }

  /**
   * Acquires real hardware battery percentage from device API (Expo Battery / Web Battery)
   */
  public async acquireBatteryLevel(): Promise<number> {
    try {
      if (Battery && Battery.getBatteryLevelAsync) {
        const level = await Battery.getBatteryLevelAsync();
        if (typeof level === 'number' && level >= 0) {
          const pct = Math.round(level * 100);
          this.currentBattery = Math.max(1, Math.min(100, pct));
          return this.currentBattery;
        }
      }
    } catch (e: any) {
      console.warn('[LocationTrackerService] Native Expo Battery API warning:', e?.message);
    }

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
        const bat = await (navigator as any).getBattery();
        if (bat && typeof bat.level === 'number') {
          const pct = Math.round(bat.level * 100);
          this.currentBattery = Math.max(1, Math.min(100, pct));
          return this.currentBattery;
        }
      }
    } catch (e) {}

    return this.currentBattery || 95;
  }

  /**
   * Formats location & battery telemetry, updates map pins, and transmits over Bluetooth
   */
  public async broadcastLocationPacket(): Promise<void> {
    const btService = BluetoothService.getInstance();
    const isConnected = btService.isConnected();
    
    // Use unique Call Sign / Node ID for this specific mobile device
    const deviceId = await getLocalNodeIdAsync();

    await this.acquireCurrentPosition();
    const battery = await this.acquireBatteryLevel();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // 1. ALWAYS update local deviceStore map pin & SQLite DB for local user display
    useDeviceStore.getState().updateLocalDeviceLocation(
      this.currentLat,
      this.currentLon,
      timeStr,
      battery
    );

    saveLocationLocally(deviceId, this.currentLat, this.currentLon, battery, timeStr).catch((err) =>
      console.error('[LocationTrackerService] Error saving location locally:', err)
    );

    // 2. Broadcast over Bluetooth hardware stream if connected (Matching Flutter format: LOC,ID,LAT,LON,TIME,BATT)
    if (isConnected) {
      const locPacket = `LOC,${deviceId},${this.currentLat.toFixed(6)},${this.currentLon.toFixed(6)},${timeStr},${battery}`;
      console.log(`[LocationTrackerService] Transmitting auto-location packet over Bluetooth: "${locPacket}"`);
      await btService.sendData(locPacket);
    }
  }
}

