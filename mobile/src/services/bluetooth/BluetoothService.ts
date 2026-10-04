export interface BluetoothDevice {
  id: string;
  name: string;
  rssi?: number;
}

export type DataCallback = (rawPacket: string) => void;
export type StatusCallback = (connected: boolean) => void;

export class BluetoothService {
  private static instance: BluetoothService;
  private connectedDeviceId: string | null = null;
  private isConnecting: boolean = false;
  private dataListeners: DataCallback[] = [];
  private statusListeners: StatusCallback[] = [];
  private simulatedGatewayInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): BluetoothService {
    if (!BluetoothService.instance) {
      BluetoothService.instance = new BluetoothService();
    }
    return BluetoothService.instance;
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      const RN = require('react-native');
      if (!RN || RN.Platform?.OS !== 'android') return true;
      const { Platform, PermissionsAndroid } = RN;

      if (typeof Platform.Version === 'number' && Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else if (PermissionsAndroid) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  public async scanDevices(): Promise<BluetoothDevice[]> {
    await this.requestPermissions();
    // Simulate active hardware RF scanning delay
    await new Promise((res) => setTimeout(res, 1200));

    return [
      { id: 'lora-gw-01', name: 'ESP32 LoRa Gateway 01', rssi: -65 },
      { id: 'lora-gw-02', name: 'Heltec V3 Gateway', rssi: -78 },
      { id: 'lora-node-dev1', name: 'TTGO T-Beam dev1', rssi: -82 },
      { id: 'lora-gw-sathy', name: 'Sathy Mesh Node 04', rssi: -71 }
    ];
  }

  public async connect(deviceId: string): Promise<boolean> {
    this.isConnecting = true;
    console.log(`[BluetoothService] Connecting to gateway: ${deviceId}...`);

    // Simulate connection delay for native BLE handshake
    await new Promise((res) => setTimeout(res, 600));

    this.connectedDeviceId = deviceId;
    this.isConnecting = false;
    this.notifyStatus(true);
    console.log(`[BluetoothService] Connected to gateway: ${deviceId}`);
    return true;
  }

  public async disconnect(): Promise<void> {
    if (this.connectedDeviceId) {
      console.log(`[BluetoothService] Disconnecting from ${this.connectedDeviceId}`);
      this.connectedDeviceId = null;
      this.notifyStatus(false);
    }
  }

  public isConnected(): boolean {
    return this.connectedDeviceId !== null;
  }

  public getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  public async reconnect(): Promise<boolean> {
    if (this.connectedDeviceId) {
      const devId = this.connectedDeviceId;
      await this.disconnect();
      return await this.connect(devId);
    }
    return false;
  }

  public async sendData(data: string): Promise<boolean> {
    if (!this.isConnected()) {
      console.warn('[BluetoothService] Cannot send data: Gateway disconnected');
      return false;
    }
    console.log(`[BluetoothService] Sending to Gateway: "${data}"`);
    return true;
  }

  public onDataReceived(callback: DataCallback): () => void {
    this.dataListeners.push(callback);
    return () => {
      this.dataListeners = this.dataListeners.filter((cb) => cb !== callback);
    };
  }

  public onStatusChanged(callback: StatusCallback): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Internal transport dispatch for incoming hardware packets.
   */
  public emitRawPacket(rawPacket: string): void {
    this.dataListeners.forEach((cb) => cb(rawPacket));
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((cb) => cb(connected));
  }
}
