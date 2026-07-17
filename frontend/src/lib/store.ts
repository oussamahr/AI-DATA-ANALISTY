import { create } from "zustand";
import { api } from "./api";
import type { UserResponse } from "./api";

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setAuth: (user: UserResponse) => void;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  setAuth: (user) =>
    set({ user, isAuthenticated: true, isLoading: false, isInitialized: true }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isInitialized: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      await api.login(email, password);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (firstName: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      await api.register(firstName, email, password);
      await api.login(email, password);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.logout();
    } catch {
      // Ignore logout errors, still clear local state
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clear: () => {
    set({ user: null, isLoading: false, isAuthenticated: false, isInitialized: true });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
