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
  isSelf?: boolean;
}

interface DeviceStoreState {
  devices: Record<string, DeviceMarker>;
  selectedDeviceId: string | null;
  setDevices: (devices: Record<string, DeviceMarker>) => void;
  setLocalNodeName: (name: string) => void;
  updateLocalDeviceLocation: (lat: number, lon: number, time: string, battery: number) => void;
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
  devices: {
    self: {
      deviceId: 'Mobile Node',
      deviceName: 'Mobile Node',
      userName: 'Mobile Node',
      latitude: 11.5034,
      longitude: 77.2444,
      lastUpdated: 'Just now',
      batteryOrValue: 95,
      status: 'online',
      isSelf: true
    }
  },
  selectedDeviceId: null,
  setDevices: (devices) => set({ devices }),
  setLocalNodeName: (name: string) =>
    set((state) => {
      const trimmed = name.trim() || 'Mobile Node';
      const existingSelf = state.devices.self || {
        latitude: 11.5034,
        longitude: 77.2444,
        lastUpdated: 'Just now',
        batteryOrValue: 95,
        status: 'online'
      };

      const nextDevices: Record<string, DeviceMarker> = {};
      // Filter out any accidental or previous duplicate self keys
      Object.entries(state.devices).forEach(([k, v]) => {
        if (k !== 'self' && k !== 'Mobile Node' && k !== trimmed && !v.isSelf && v.deviceId !== 'self' && v.deviceId !== trimmed && v.deviceId !== 'Mobile Node') {
          nextDevices[k] = v;
        }
      });

      nextDevices.self = {
        ...existingSelf,
        deviceId: trimmed,
        deviceName: trimmed,
        userName: trimmed,
        isSelf: true
      };

      return { devices: nextDevices };
    }),
  updateLocalDeviceLocation: (lat: number, lon: number, time: string, battery: number) =>
    set((state) => {
      const existing = state.devices.self || {
        deviceId: 'Mobile Node',
        deviceName: 'Mobile Node',
        userName: 'Mobile Node',
        status: 'online',
        isSelf: true
      };
      return {
        devices: {
          ...state.devices,
          self: {
            ...existing,
            latitude: lat,
            longitude: lon,
            lastUpdated: time,
            batteryOrValue: battery,
            status: 'online',
            isSelf: true
          }
        }
      };
    }),
  registerDevice: (deviceId: string, deviceName?: string, userName?: string) =>
    set((state) => {
      if (!deviceId) return state;
      const selfName = state.devices.self?.deviceId;
      if (deviceId === 'self' || deviceId === selfName || deviceId === 'Mobile Node' || deviceId === 'User') {
        return state;
      }

      const updatedDevices = { ...state.devices };
      if (!updatedDevices[deviceId]) {
        updatedDevices[deviceId] = {
          deviceId,
          deviceName: deviceName || deviceId,
          userName: userName || deviceId,
          latitude: 11.5034,
          longitude: 77.2444,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          batteryOrValue: 100,
          status: 'online',
          isSelf: false
        };
        return { devices: updatedDevices };
      }
      return state;
    }),
  updateDeviceLocation: (deviceId, lat, lon, time, value, deviceName, userName) =>
    set((state) => {
      const selfName = state.devices.self?.deviceId;
      // If updating the local self node
      if (
        deviceId === 'self' ||
        deviceId === selfName ||
        deviceId === 'Mobile Node' ||
        (state.devices.self && deviceId === state.devices.self.userName)
      ) {
        // Drop incoming LOC packets that belong to our own device.
        // The ESP32 mesh often echoes our own packets back to us.
        // We already update our local self node via updateLocalDeviceLocation,
        // so we don't want delayed echoed packets overwriting our live timestamp!
        return state;
      }

      // Otherwise update remote peer node
      const updatedDevices = { ...state.devices };
      const existing = updatedDevices[deviceId] || {
        deviceId,
        deviceName: deviceName || deviceId,
        userName: userName || deviceId,
        status: 'online',
        isSelf: false
      };

      updatedDevices[deviceId] = {
        ...existing,
        latitude: lat,
        longitude: lon,
        lastUpdated: time,
        batteryOrValue: value,
        status: 'online',
        isSelf: false
      };

      return { devices: updatedDevices };
    }),
  setCustomDeviceName: (deviceId, newName) =>
    set((state) => {
      const trimmed = newName.trim();
      if (!trimmed) return state;

      if (deviceId === 'self' || deviceId === state.devices.self?.deviceId) {
        return {
          devices: {
            ...state.devices,
            self: {
              ...state.devices.self,
              deviceId: trimmed,
              deviceName: trimmed,
              userName: trimmed,
              isSelf: true
            }
          }
        };
      }

      const existing = state.devices[deviceId];
      if (!existing) return state;

      const nextDevices = { ...state.devices };
      delete nextDevices[deviceId];
      nextDevices[trimmed] = {
        ...existing,
        deviceId: trimmed,
        deviceName: trimmed,
        userName: trimmed,
        isSelf: false
      };

      return { devices: nextDevices };
    }),
  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
  clearDevices: () => set({
    devices: {
      self: {
        deviceId: 'self',
        deviceName: 'Mobile Node',
        latitude: 11.5034,
        longitude: 77.2444,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'online',
        batteryOrValue: 100,
        isSelf: true
      }
    },
    selectedDeviceId: null
  })
}));
