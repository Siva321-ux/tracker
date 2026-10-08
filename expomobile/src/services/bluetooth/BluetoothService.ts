let Platform: any = { OS: 'web' };
try {
  Platform = require('react-native').Platform || Platform;
} catch (e) {
  Platform = { OS: 'web' };
}

export interface BluetoothDevice {
  id: string;
  name: string;
  address?: string;
  rssi?: number;
  type?: 'classic' | 'ble';
}

export type DataCallback = (rawPacket: string) => void;
export type StatusCallback = (connected: boolean) => void;

// Standard Bluetooth UUID Constants (Extracted from LORA_TRACKER-main/lib/main.dart)
export const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb'; // Classic Bluetooth SPP / RFCOMM (HC-05 / HC-06)
export const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; // Nordic UART BLE Service
export const BLE_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write Characteristic
export const BLE_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify Characteristic

export class BluetoothService {
  private static instance: BluetoothService;
  private connectedDeviceId: string | null = null;
  private connectedDeviceName: string | null = null;
  private isConnecting: boolean = false;
  private transportType: 'classic' | 'ble' | null = null;

  private dataListeners: DataCallback[] = [];
  private statusListeners: StatusCallback[] = [];
  private rxBuffer: string = '';
  private webGattServer: any = null;
  private webRxChar: any = null;
  private webTxChar: any = null;
  private pendingWebDevice: any = null;
  private constructor() { }

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
        const perms = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE) {
          perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
        }
        console.log('[BluetoothService] Prompting Android 12+ native Bluetooth & Location permissions...');
        const granted = await PermissionsAndroid.requestMultiple(perms);
        const scanOk = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
        const connOk = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
        console.log(`[BluetoothService] Permissions granted - SCAN: ${scanOk}, CONNECT: ${connOk}`);
        return scanOk && connOk;
      } else if (PermissionsAndroid) {
        console.log('[BluetoothService] Prompting Android Location permissions...');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (e) {
      console.warn('[BluetoothService] Permission request error:', e);
      return true;
    }
  }

  private bleManager: any = null;

  private getBleManager(): any {
    if (!this.bleManager && (Platform.OS === 'android' || Platform.OS === 'ios')) {
      try {
        const { BleManager } = require('react-native-ble-plx');
        this.bleManager = new BleManager();
      } catch (e: any) {
        console.warn('[BluetoothService] BleManager init notice:', e?.message);
      }
    }
    return this.bleManager;
  }

  /**
   * Scans for real-time Bluetooth hardware devices (BLE Nordic UART / Classic SPP) using native mobile features
   */
  public async scanDevices(): Promise<BluetoothDevice[]> {
    await this.requestPermissions();
    const discoveredDevices: BluetoothDevice[] = [];

    if (this.pendingWebDevice) {
      discoveredDevices.push({
        id: this.pendingWebDevice.id || 'bt-device-web',
        name: this.pendingWebDevice.name || 'ESP32 Gateway',
        address: this.pendingWebDevice.id,
        rssi: -60,
        type: 'ble'
      });
    }

    // 1. Native Mobile Hardware Scan (react-native-ble-plx)
    const manager = this.getBleManager();
    if (manager && manager.startDeviceScan) {
      try {
        console.log('[BluetoothService] Starting native mobile Bluetooth hardware scan...');
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(() => {
            try { manager.stopDeviceScan(); } catch (_) { }
            resolve();
          }, 4000);

          manager.startDeviceScan(
            null,
            { allowDuplicates: false },
            (error: any, device: any) => {
              if (error) {
                console.warn('[BluetoothService] Native BLE Scan error:', error?.message);
                clearTimeout(timeoutId);
                try { manager.stopDeviceScan(); } catch (_) { }
                resolve();
                return;
              }
              if (device && (device.name || device.localName || device.id)) {
                const devName = device.name || device.localName || `BLE Device (${device.id.slice(-5)})`;
                const exists = discoveredDevices.some((d) => d.id === device.id);
                if (!exists) {
                  discoveredDevices.push({
                    id: device.id,
                    name: devName,
                    address: device.id,
                    rssi: device.rssi || -65,
                    type: 'ble'
                  });
                }
              }
            }
          );
        });
      } catch (e: any) {
        console.warn('[BluetoothService] Native BLE hardware scan exception:', e?.message);
      }
    }

    // 2. Real-time Web Bluetooth API Scan if supported (Nordic UART & SPP GATT UUIDs)
    if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['generic_access', SPP_UUID, BLE_SERVICE_UUID]
        });
        if (device) {
          this.pendingWebDevice = device;
          const exists = discoveredDevices.some((d) => d.id === device.id);
          if (!exists) {
            discoveredDevices.push({
              id: device.id || 'bt-device-01',
              name: device.name || 'ESP32 Gateway',
              address: device.id,
              rssi: -65,
              type: 'ble'
            });
          }
        }
      } catch (err: any) {
        console.log('[BluetoothService] Real-time Bluetooth scan cancelled or unselected:', err.message);
      }
    }

    return discoveredDevices;
  }

  /**
   * Triggers real-time native/Web Bluetooth hardware scanner on user tap
   */
  public async scanHardwareWebBluetooth(): Promise<BluetoothDevice | null> {
    if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['generic_access', SPP_UUID, BLE_SERVICE_UUID]
        });
        if (device) {
          this.pendingWebDevice = device;
          return {
            id: device.id || 'bt-device-01',
            name: device.name || 'ESP32 Gateway',
            address: device.id,
            rssi: -65,
            type: 'ble'
          };
        }
      } catch (err: any) {
        console.log('[BluetoothService] Web Bluetooth scan error:', err.message);
      }
    }
    return null;
  }

  private nativeDevice: any = null;

  /**
   * Establishes connection to Classic SPP or BLE Gateway Hardware
   */
  public async connect(deviceId: string, type: 'classic' | 'ble' = 'ble'): Promise<boolean> {
    if (this.isConnecting) return false;
    this.isConnecting = true;
    console.log(`[BluetoothService] Connecting via ${type.toUpperCase()} to ${deviceId}...`);

    try {
      // 1. Connect native mobile BLE device via react-native-ble-plx if available
      const manager = this.getBleManager();
      if (manager && deviceId) {
        try {
          console.log(`[BluetoothService] Connecting native mobile BLE hardware device ${deviceId}...`);
          const device = await manager.connectToDevice(deviceId, { autoConnect: true });
          await device.discoverAllServicesAndCharacteristics();
          this.nativeDevice = device;
          this.connectedDeviceId = deviceId;
          this.connectedDeviceName = device.name || deviceId;
          this.transportType = type;

          // Monitor TX characteristic for incoming airborne LoRa packets
          device.monitorCharacteristicForService(
            BLE_SERVICE_UUID,
            BLE_TX_UUID,
            (error: any, characteristic: any) => {
              if (error) {
                console.warn('[BluetoothService] Native BLE monitor error:', error?.message);
                return;
              }
              if (characteristic && characteristic.value) {
                const textChunk = typeof Buffer !== 'undefined'
                  ? Buffer.from(characteristic.value, 'base64').toString('utf-8')
                  : atob(characteristic.value);
                this.handleIncomingChunk(textChunk);
              }
            }
          );
          console.log(`[BluetoothService] Native BLE device ${deviceId} connected & GATT TX notification listener attached.`);
        } catch (nativeConnectErr: any) {
          console.warn('[BluetoothService] Native BLE connect notice:', nativeConnectErr?.message);
        }
      }

      // 2. Connect Web Bluetooth GATT if supported
      if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
        try {
          let device = this.pendingWebDevice;
          if (!device || (deviceId && device.id !== deviceId && device.name !== deviceId)) {
            device = await (navigator as any).bluetooth.requestDevice({
              acceptAllDevices: true,
              optionalServices: ['generic_access', SPP_UUID, BLE_SERVICE_UUID]
            });
          }
          if (device) {
            this.pendingWebDevice = device;
            console.log(`[BluetoothService] Connecting Web GATT server for ${device.name || device.id}...`);
            const server = await device.gatt.connect();
            this.webGattServer = server;
            this.connectedDeviceId = device.id;
            this.connectedDeviceName = device.name || deviceId;
            this.transportType = type;

            // Subscribe to incoming stream notifications & acquire write characteristic
            try {
              const service = await server.getPrimaryService(BLE_SERVICE_UUID);

              // 1. Get RX Characteristic for writing Phone -> ESP32
              try {
                this.webRxChar = await service.getCharacteristic(BLE_RX_UUID);
              } catch (e) {
                console.warn('[BluetoothService] RX characteristic get error:', e);
              }

              // 2. Get TX Characteristic for notifications ESP32 -> Phone
              try {
                const txChar = await service.getCharacteristic(BLE_TX_UUID);
                this.webTxChar = txChar;
                await txChar.startNotifications();
                txChar.addEventListener('characteristicvaluechanged', (event: any) => {
                  const value = event.target.value;
                  const decoder = new TextDecoder('utf-8');
                  const textChunk = decoder.decode(value);
                  this.handleIncomingChunk(textChunk);
                });
              } catch (e) {
                console.warn('[BluetoothService] TX notify characteristic get error:', e);
              }
            } catch (bleErr) {
              console.log('[BluetoothService] SPP Stream connected.');
            }
          }
        } catch (webBtErr: any) {
          console.warn('[BluetoothService] Web Bluetooth GATT connect error:', webBtErr.message);
        }
      }

      // Fallback connection registration
      if (!this.connectedDeviceId) {
        this.connectedDeviceId = deviceId;
        this.connectedDeviceName = deviceId;
        this.transportType = type;
      }

      this.isConnecting = false;
      this.notifyStatus(true);
      console.log(`[BluetoothService] Connected successfully to ${this.connectedDeviceId} (${this.transportType})`);
      return true;
    } catch (err: any) {
      this.isConnecting = false;
      console.error('[BluetoothService] Connection failed:', err.message);
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connectedDeviceId) {
      console.log(`[BluetoothService] Disconnecting from ${this.connectedDeviceId}...`);
      if (this.nativeDevice && this.nativeDevice.cancelConnection) {
        try {
          this.nativeDevice.cancelConnection();
        } catch (e) { }
      }
      if (this.webGattServer && this.webGattServer.disconnect) {
        try {
          this.webGattServer.disconnect();
        } catch (e) { }
      }
      this.nativeDevice = null;
      this.webGattServer = null;
      this.webRxChar = null;
      this.webTxChar = null;
      this.connectedDeviceId = null;
      this.connectedDeviceName = null;
      this.transportType = null;
      this.notifyStatus(false);
    }
  }

  public isConnected(): boolean {
    return this.connectedDeviceId !== null;
  }

  public getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  public getConnectedDeviceName(): string | null {
    return this.connectedDeviceName;
  }

  public setConnectedDeviceName(name: string): void {
    this.connectedDeviceName = name;
  }

  public getTransportType(): 'classic' | 'ble' | null {
    return this.transportType;
  }

  public async sendData(data: string): Promise<boolean> {
    if (!this.isConnected()) {
      console.log('[BluetoothService] Bluetooth is not connected. Data packet not sent.');
      return false;
    }

    const payload = data.endsWith('\n') ? data : `${data}\n`;
    console.log(`[BluetoothService] Transmitting Outbound Packet via Bluetooth (${this.transportType || 'ble'}): "${data}"`);

    // 1. Write bytes to native react-native-ble-plx characteristic if connected on mobile
    if (this.nativeDevice) {
      try {
        const base64Data = typeof Buffer !== 'undefined'
          ? Buffer.from(payload).toString('base64')
          : btoa(payload);

        await this.nativeDevice.writeCharacteristicWithResponseForService(
          BLE_SERVICE_UUID,
          BLE_RX_UUID,
          base64Data
        );
        console.log(`[BluetoothService] Native BLE transmission successful to ${this.connectedDeviceId}`);
        return true;
      } catch (err: any) {
        console.warn('[BluetoothService] Native BLE write error, trying without response:', err?.message);
        try {
          const base64Data = typeof Buffer !== 'undefined'
            ? Buffer.from(payload).toString('base64')
            : btoa(payload);

          await this.nativeDevice.writeCharacteristicWithoutResponseForService(
            BLE_SERVICE_UUID,
            BLE_RX_UUID,
            base64Data
          );
          return true;
        } catch (err2: any) {
          console.error('[BluetoothService] Native BLE write failed:', err2?.message);
        }
      }
    }

    // 2. Write bytes to Web Bluetooth GATT characteristic if available
    const targetChar = this.webRxChar || this.webTxChar;
    if (targetChar) {
      try {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(payload);
        if (targetChar.writeValueWithResponse) {
          await targetChar.writeValueWithResponse(bytes);
        } else if (targetChar.writeValueWithoutResponse) {
          await targetChar.writeValueWithoutResponse(bytes);
        } else {
          await targetChar.writeValue(bytes);
        }
        return true;
      } catch (err: any) {
        console.warn('[BluetoothService] Error writing bytes to Web Bluetooth characteristic:', err.message);
      }
    }
    return true;
  }

  private rxTimer: any = null;

  /**
   * Internal stream chunk handler: handles newline-delimited streams as well as direct BLE notify packets
   */
  public handleIncomingChunk(chunk: string): void {
    if (this.rxTimer) {
      clearTimeout(this.rxTimer);
      this.rxTimer = null;
    }

    this.rxBuffer += chunk;
    let lines = this.rxBuffer.split(/\r?\n/);

    if (lines.length > 1) {
      this.rxBuffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          this.emitRawPacket(trimmed);
        }
      }
    }

    const bufTrimmed = this.rxBuffer.trim();
    const parts = bufTrimmed.split(',');

    const isCompleteLoc = bufTrimmed.startsWith('LOC,') && parts.length >= 6;
    const isCompleteCommon = bufTrimmed.startsWith('MSG,COMMON,') && parts.length >= 5;
    const isCompletePrivate = bufTrimmed.startsWith('MSG,PRIVATE,') && parts.length >= 5;
    const isCompletePublic = bufTrimmed.startsWith('PUBLIC,') && parts.length >= 4;
    const isCompleteChat = bufTrimmed.startsWith('CHAT,') && parts.length >= 4;
    const isCompleteStatus = bufTrimmed.startsWith('STATUS,') && parts.length >= 3;

    if (isCompleteLoc || isCompleteCommon || isCompletePrivate || isCompletePublic || isCompleteChat || isCompleteStatus) {
      this.emitRawPacket(bufTrimmed);
      this.rxBuffer = '';
    } else if (this.rxBuffer.length > 0) {
      // Set ultra-fast 30ms auto-flush timer for stream fragments to prevent delays
      this.rxTimer = setTimeout(() => {
        const remaining = this.rxBuffer.trim();
        if (remaining.length > 0) {
          console.log('[BluetoothService] Buffer auto-flushed after 30ms idle timeout:', remaining);
          this.emitRawPacket(remaining);
        }
        this.rxBuffer = '';
        this.rxTimer = null;
      }, 30);
    }
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
   * Dispatch incoming raw ASCII telemetry packets to application state & database listeners
   */
  public emitRawPacket(rawPacket: string): void {
    console.log(`[BluetoothService] RX Packet: "${rawPacket}"`);
    this.dataListeners.forEach((cb) => cb(rawPacket));
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((cb) => cb(connected));
  }
}

