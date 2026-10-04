import { create } from 'zustand';

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  updateUserName: (name) =>
    set((state) => ({
      user: state.user ? { ...state.user, name } : null
    })),
  logout: () => set({ user: null, token: null, isAuthenticated: false })
}));
