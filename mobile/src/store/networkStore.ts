import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  isLoraConnected: boolean;
  setOnlineStatus: (status: boolean) => void;
  setLoraStatus: (status: boolean) => void;
  toggleNetwork: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  isLoraConnected: true,
  setOnlineStatus: (status) => set({ isOnline: status }),
  setLoraStatus: (status) => set({ isLoraConnected: status }),
  toggleNetwork: () => set((state) => ({ isOnline: !state.isOnline }))
}));
