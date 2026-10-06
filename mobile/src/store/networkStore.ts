import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  isLoraConnected: boolean;
  setOnlineStatus: (status: boolean) => void;
  setLoraStatus: (status: boolean) => void;
  initDynamicNetworkListener: () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
  isLoraConnected: true,
  setOnlineStatus: (status) => set({ isOnline: status }),
  setLoraStatus: (status) => set({ isLoraConnected: status }),

  initDynamicNetworkListener: () => {
    // 1. Listen for system online/offline network state changes
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', () => set({ isOnline: true }));
      window.addEventListener('offline', () => set({ isOnline: false }));
    }

    // 2. Dynamic background ping for real internet reachability check
    setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://tracker-91ku.onrender.com/api/health', {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          if (!get().isOnline) set({ isOnline: true });
        } else {
          if (get().isOnline) set({ isOnline: false });
        }
      } catch (err) {
        if (get().isOnline) set({ isOnline: false });
      }
    }, 15000);
  }
}));

// Initialize dynamic network listener on app start
useNetworkStore.getState().initDynamicNetworkListener();
