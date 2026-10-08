import { BluetoothService } from '../bluetooth/BluetoothService';

export interface DeviceSimState {
  deviceId: string;
  latitude: number;
  longitude: number;
  battery: number;
  latStep: number;
  lonStep: number;
}

export type PresetRegion = 'sathy' | 'coimbatore' | 'chennai' | 'bengaluru';

export class LoraSimulator {
  private static instance: LoraSimulator;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private intervalMs: number = 3000;
  private currentRegion: PresetRegion = 'coimbatore';

  private devices: DeviceSimState[] = [];

  private constructor() {
    this.setRegion('coimbatore');
  }

  public static getInstance(): LoraSimulator {
    if (!LoraSimulator.instance) {
      LoraSimulator.instance = new LoraSimulator();
    }
    return LoraSimulator.instance;
  }

  public setCustomCoordinates(lat: number, lon: number): void {
    console.log(`[LoraSimulator] Updating device center coordinates to (${lat}, ${lon})`);
    this.devices = [
      { deviceId: 'dev1', latitude: lat, longitude: lon, battery: 88, latStep: 0.0003, lonStep: 0.0002 },
      { deviceId: 'dev2', latitude: lat + 0.002, longitude: lon + 0.002, battery: 91, latStep: -0.0002, lonStep: 0.0004 },
      { deviceId: 'dev3', latitude: lat - 0.002, longitude: lon - 0.002, battery: 76, latStep: 0.0004, lonStep: -0.0003 },
      { deviceId: 'dev4', latitude: lat + 0.004, longitude: lon - 0.003, battery: 83, latStep: -0.0003, lonStep: -0.0002 },
      { deviceId: 'dev5', latitude: lat + 0.001, longitude: lon + 0.004, battery: 95, latStep: 0.0002, lonStep: 0.0003 }
    ];
  }

  public setRegion(region: PresetRegion): void {
    this.currentRegion = region;
    let baseLat = 11.0168;
    let baseLon = 76.9558;

    if (region === 'sathy') {
      baseLat = 11.5034;
      baseLon = 77.2444;
    } else if (region === 'coimbatore') {
      baseLat = 11.0168;
      baseLon = 76.9558;
    } else if (region === 'chennai') {
      baseLat = 13.0827;
      baseLon = 80.2707;
    } else if (region === 'bengaluru') {
      baseLat = 12.9716;
      baseLon = 77.5946;
    }

    this.setCustomCoordinates(baseLat, baseLon);
  }

  public startSimulation(intervalMs: number = 3000): void {
    if (this.isRunning) return;
    this.intervalMs = intervalMs;
    this.isRunning = true;
    console.log(`[LoraSimulator] Starting 5-device simulation stream in ${this.currentRegion} region...`);

    let devIdx = 0;
    this.timer = setInterval(() => {
      const dev = this.devices[devIdx];

      dev.latitude = parseFloat((dev.latitude + dev.latStep).toFixed(6));
      dev.longitude = parseFloat((dev.longitude + dev.lonStep).toFixed(6));

      if (Math.random() > 0.7 && dev.battery > 15) {
        dev.battery -= 1;
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const rawLocPacket = `LOC,${dev.deviceId},${dev.latitude.toFixed(4)},${dev.longitude.toFixed(4)},${timeStr},${dev.battery}`;

      BluetoothService.getInstance().emitRawPacket(rawLocPacket);

      devIdx = (devIdx + 1) % this.devices.length;
    }, this.intervalMs);
  }

  public stopSimulation(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[LoraSimulator] Simulation stopped');
  }

  public isSimulating(): boolean {
    return this.isRunning;
  }

  public generateSinglePacket(deviceId: string, lat: number, lon: number, value: number = 85): string {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const packet = `LOC,${deviceId},${lat.toFixed(4)},${lon.toFixed(4)},${timeStr},${value}`;
    BluetoothService.getInstance().emitRawPacket(packet);
    return packet;
  }
}
