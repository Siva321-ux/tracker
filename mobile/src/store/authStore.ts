import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  language: string;
  status: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  updateUserName: (name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUserName: (name) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, name }
            : { id: Date.now(), name, email: `${name.toLowerCase()}@mesh.node`, language: 'en', status: 'online' }
        })),
      logout: () => set({ user: null, token: null, isAuthenticated: false })
    }),
    {
      name: 'lora-auth-storage',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
