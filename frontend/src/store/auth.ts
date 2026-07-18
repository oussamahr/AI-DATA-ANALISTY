import { create } from 'zustand'
import { authApi } from '@/services/api'
import type { User } from '@/types/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (firstName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    // ============================================
    // TEMPORARY DEMO BYPASS — REMOVE BEFORE PRODUCTION
    // Forces a demo user so all pages are visible without backend login
    // ============================================
    const DEMO_USER: User = {
      id: "demo-user-001",
      email: "demo@aether.ai",
      first_name: "Alex",
      last_name: "Rivera",
      is_verified: true,
      is_active: true,
      is_superuser: true,
      role_id: "admin",
      tenant_id: "demo-tenant",
      last_login_at: new Date().toISOString(),
    }

    set({ 
      user: DEMO_USER, 
      isAuthenticated: true, 
      isInitialized: true, 
      isLoading: false 
    })
    return
    // ============================================

    // Original real auth code (commented out for demo)
    /*
    set({ isLoading: true })
    try {
      const user = await authApi.getMe()
      set({ 
        user, 
        isAuthenticated: true, 
        isInitialized: true, 
        isLoading: false 
      })
    } catch {
      set({ 
        user: null, 
        isAuthenticated: false, 
        isInitialized: true, 
        isLoading: false 
      })
    }
    */
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      await authApi.login({ email, password })
      const user = await authApi.getMe()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (firstName: string, email: string, password: string) => {
    set({ isLoading: true })
    try {
      await authApi.register({ first_name: firstName, email, password })
      // Backend auto logs in on successful register? But to be safe, login again
      await authApi.login({ email, password })
      const user = await authApi.getMe()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await authApi.logout()
    } finally {
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      })
    }
  },

  updateUser: (updates) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }))
  },
}))
