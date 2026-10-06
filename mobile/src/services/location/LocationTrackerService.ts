import { Platform } from 'react-native';
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
  public startTracking(intervalMs: number = 10000): void {
    if (this.isTracking) return;
    this.isTracking = true;

    console.log('[LocationTrackerService] Starting automatic GPS & Bluetooth telemetry broadcasting...');

    // 1. Fetch initial position
    this.acquireCurrentPosition();

    // 2. Set up periodic location update & Bluetooth broadcast loop
    this.trackingInterval = setInterval(() => {
      this.acquireCurrentPosition();
      this.broadcastLocationPacket();
    }, intervalMs);
  }

  public stopTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    this.isTracking = false;
    console.log('[LocationTrackerService] Location tracking stopped.');
  }

  /**
   * Acquires live hardware GPS coordinates from Web Browser or Native OS
   */
  private acquireCurrentPosition(): void {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentLat = pos.coords.latitude;
          this.currentLon = pos.coords.longitude;
        },
        (err) => {
          console.warn('[LocationTrackerService] Geolocation fetch notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    }
  }

  /**
   * Acquires real hardware battery percentage from device API
   */
  private async acquireBatteryLevel(): Promise<number> {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
        const bat = await (navigator as any).getBattery();
        if (bat && typeof bat.level === 'number') {
          return Math.round(bat.level * 100);
        }
      }
    } catch (e) {
      console.warn('[LocationTrackerService] Battery API error:', e);
    }
    return 100;
  }

  /**
   * Formats and transmits LOC packet over Bluetooth to ESP32 gateway
   */
  public async broadcastLocationPacket(): Promise<void> {
    const btService = BluetoothService.getInstance();
    if (!btService.isConnected()) {
      return; // Bluetooth hardware not connected. Suppress location telemetry broadcast.
    }

    const user = useAuthStore.getState().user;
    const connectedNode = btService.getConnectedDeviceName();
    const deviceId = connectedNode || user?.name || 'User';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const battery = await this.acquireBatteryLevel();

    const locPacket = `LOC,${deviceId},${this.currentLat.toFixed(4)},${this.currentLon.toFixed(4)},${timeStr},${battery}`;

    // 1. Update local state & SQLite DB
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
    console.log(`[LocationTrackerService] Transmitting auto-location packet over Bluetooth: "${locPacket}"`);
    await btService.sendData(locPacket);
  }
}
