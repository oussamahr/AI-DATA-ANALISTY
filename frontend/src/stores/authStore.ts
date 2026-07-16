import { create } from "zustand";
import api from "@/lib/api";
import type { User, AuthTokens } from "@/types/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("access_token"),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<AuthTokens>("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      set({ isAuthenticated: true });
      await useAuthStore.getState().fetchProfile();
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, firstName, lastName) => {
    set({ isLoading: true });
    try {
      await api.post("/auth/register", {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      api.post("/auth/logout").catch(() => {});
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const res = await api.get<User>("/auth/me");
      set({ user: res.data, isAuthenticated: true });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, isAuthenticated: false });
    }
  },
}));
