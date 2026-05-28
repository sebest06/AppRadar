import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  login: (user: User, token: string, refreshToken: string) => void
  updateToken: (token: string, refreshToken: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

const savedUser = localStorage.getItem('user')
const savedToken = localStorage.getItem('token')
const savedRefreshToken = localStorage.getItem('refreshToken')

export const useAuthStore = create<AuthState>((set, get) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken ?? null,
  refreshToken: savedRefreshToken ?? null,

  login: (user, token, refreshToken) => {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    set({ user, token, refreshToken })
  },

  updateToken: (token, refreshToken) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    set({ token, refreshToken })
  },

  logout: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    set({ user: null, token: null, refreshToken: null })
  },

  isAuthenticated: () => !!get().token,
}))
