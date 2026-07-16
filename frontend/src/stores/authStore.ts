import { create } from "zustand";
import api from "@/lib/api";
import type { User } from "@/types/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Tokens are now set as httpOnly cookies by the backend
      await api.post("/auth/login", {
        email,
        password,
      });
      set({ isAuthenticated: true });
      await useAuthStore.getState().fetchProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/register", {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors on logout
    } finally {
      // Tokens are cleared as httpOnly cookies by backend
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  fetchProfile: async () => {
    try {
      const res = await api.get<User>("/auth/me");
      set({ user: res.data, isAuthenticated: true, error: null });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
