import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../lib/types';

const KEY = 'conteoagil.session';

type AuthState = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (employeeNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,

  // Al abrir la app, recupera la sesión guardada
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { token: string; user: User };
        set({ token: saved.token, user: saved.user });
      }
    } finally {
      set({ hydrated: true });
    }
  },

  login: async (employeeNumber, password) => {
    const res = await api<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { employeeNumber, password },
    });
    await SecureStore.setItemAsync(
      KEY,
      JSON.stringify({ token: res.accessToken, user: res.user }),
    );
    set({ token: res.accessToken, user: res.user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(KEY);
    set({ token: null, user: null });
  },
}));