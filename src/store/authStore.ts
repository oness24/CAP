import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { publicPost } from '@/lib/api'

interface AuthUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'analyst' | 'viewer'
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  user: AuthUser
}

interface RefreshResponse {
  access_token: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const data = await publicPost<LoginResponse>('/auth/login', { email, password })
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      refresh: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return false
        try {
          const data = await publicPost<RefreshResponse>('/auth/refresh', {
            refresh_token: refreshToken,
          })
          set({ accessToken: data.access_token })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'cap-dash-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
