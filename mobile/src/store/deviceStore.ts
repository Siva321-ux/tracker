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
  updateDeviceLocation: (deviceId, lat, lon, time, value, deviceName, userName) =>
    set((state) => {
      const existing = state.devices[deviceId] || {
        deviceId,
        deviceName: deviceName || `Device ${deviceId}`,
        userName: userName || deviceId,
        status: 'online'
      };

      return {
        devices: {
          ...state.devices,
          [deviceId]: {
            ...existing,
            latitude: lat,
            longitude: lon,
            lastUpdated: time,
            batteryOrValue: value,
            status: 'online'
          }
        }
      };
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
