import { create } from 'zustand';

export interface DeviceMarker {
  deviceId: string;
  deviceName: string;
  userName?: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  status: 'online' | 'offline' | 'warning';
  batteryOrValue: number;
}

interface DeviceStoreState {
  devices: Record<string, DeviceMarker>;
  selectedDeviceId: string | null;
  setDevices: (devices: Record<string, DeviceMarker>) => void;
  registerDevice: (deviceId: string, deviceName?: string, userName?: string) => void;
  updateDeviceLocation: (
    deviceId: string,
    lat: number,
    lon: number,
    time: string,
    value: number,
    deviceName?: string,
    userName?: string
  ) => void;
  setCustomDeviceName: (deviceId: string, newName: string) => void;
  selectDevice: (deviceId: string | null) => void;
  clearDevices: () => void;
}

export const useDeviceStore = create<DeviceStoreState>((set) => ({
  devices: {},
  selectedDeviceId: null,
  setDevices: (devices) => set({ devices }),
  registerDevice: (deviceId, deviceName, userName) =>
    set((state) => {
      if (!deviceId || deviceId === 'User' || deviceId === 'ESP32 Gateway') return state;
      const updatedDevices = { ...state.devices };
      delete updatedDevices['User'];
      delete updatedDevices['ESP32 Gateway'];
      if (!updatedDevices[deviceId]) {
        updatedDevices[deviceId] = {
          deviceId,
          deviceName: deviceName || deviceId,
          userName: userName || deviceId,
          latitude: 11.5034,
          longitude: 77.2444,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          batteryOrValue: 100,
          status: 'online'
        };
        return { devices: updatedDevices };
      }
      return state;
    }),
  updateDeviceLocation: (deviceId, lat, lon, time, value, deviceName, userName) =>
    set((state) => {
      const updatedDevices = { ...state.devices };
      // Purge generic 'User' or 'ESP32 Gateway' placeholder entries if real callsign is added
      if (deviceId !== 'User' && deviceId !== 'ESP32 Gateway') {
        delete updatedDevices['User'];
        delete updatedDevices['ESP32 Gateway'];
      }

      const existing = updatedDevices[deviceId] || {
        deviceId,
        deviceName: deviceName || `Device ${deviceId}`,
        userName: userName || deviceId,
        status: 'online'
      };

      updatedDevices[deviceId] = {
        ...existing,
        latitude: lat,
        longitude: lon,
        lastUpdated: time,
        batteryOrValue: value,
        status: 'online'
      };

      return { devices: updatedDevices };
    }),
  setCustomDeviceName: (deviceId, newName) =>
    set((state) => {
      const existing = state.devices[deviceId];
      if (!existing) return state;
      return {
        devices: {
          ...state.devices,
          [deviceId]: {
            ...existing,
            userName: newName,
            deviceName: newName
          }
        }
      };
    }),
  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
  clearDevices: () => set({ devices: {}, selectedDeviceId: null })
}));
