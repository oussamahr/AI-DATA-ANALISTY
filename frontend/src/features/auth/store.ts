import { create } from "zustand";
import { authApi } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<User>;
  logout: () => Promise<void>;
  clear: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  isAuthenticated: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isInitialized: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      await authApi.login({ email, password });
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, firstName: string, lastName: string) => {
    const user = await authApi.register({ email, password, first_name: firstName, last_name: lastName });
    return user;
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors, still clear local state
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clear: () => {
    set({ user: null, isLoading: false, isAuthenticated: false, isInitialized: true });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
