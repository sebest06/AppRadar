import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let refreshQueue: ((token: string) => void)[] = []

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry || original.url?.includes('/auth/')) {
      return Promise.reject(error)
    }
    const storedRefresh = localStorage.getItem('refreshToken')
    if (!storedRefresh) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }
    original._retry = true
    isRefreshing = true
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken: storedRefresh })
      const { useAuthStore } = await import('../store/authStore')
      useAuthStore.getState().updateToken(data.token, data.refreshToken)
      api.defaults.headers.common.Authorization = `Bearer ${data.token}`
      refreshQueue.forEach((cb) => cb(data.token))
      refreshQueue = []
      original.headers.Authorization = `Bearer ${data.token}`
      return api(original)
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

// Auth
export const authApi = {
  login: (user: string, passw: string) =>
    api.post<{ token: string; user: import('../types').User }>('/auth/login', { user, passw }),
  register: (data: { user: string; passw: string; nombre: string; team?: string; uuid_team?: string; role?: string }) =>
    api.post<{ token: string; user: import('../types').User }>('/auth/register', data),
}

// Categories
export const categoriesApi = {
  list: () => api.get<import('../types').Category[]>('/categories'),
}

// Me / Profile
export const meApi = {
  get: () => api.get<import('../types').User>('/me'),
  update: (data: { nombre?: string; activityType?: string }) => api.put<import('../types').User>('/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/me/password', { currentPassword, newPassword }),
  history: (options?: { limit?: number; offset?: number }) =>
    api.get<import('../types').Paginated<import('../types').RunHistoryEntry>>('/me/history', { params: options }),
}

// Teams
export const teamsApi = {
  list: () => api.get<{ uuid_team: string; team: string }[]>('/teams'),
  getRequests: () => api.get<import('../types').User[]>('/team/requests'),
  acceptRequest: (userUuid: string) => api.post(`/team/requests/${userUuid}/accept`),
  rejectRequest: (userUuid: string) => api.post(`/team/requests/${userUuid}/reject`),
}

// Trails / Races
export const trailsApi = {
  list: () => api.get<import('../types').Trail[]>('/trails'),
  details: (id: string) => api.get<import('../types').TrailWithWaypoints>(`/trails/${id}/details`),
  create: (data: {
    name: string
    description: string
    distanceKm: number
    elevationM: number
    maxSkip: number
    waypoints: { order: number; name: string; lat: number; lon: number; radius: number }[]
  }) => api.post<import('../types').Trail>('/trails', data),
  update: (id: string, data: Partial<import('../types').Trail>) =>
    api.put<import('../types').Trail>(`/trails/${id}`, data),
  delete: (id: string) => api.delete(`/trails/${id}`),
  activate: (id: string) => api.post(`/trails/${id}/activate`),
}

export type { Paginated } from '../types'

// Rankings
export const rankingsApi = {
  get: (trailUuid: string, options?: { teamUuid?: string; sessionUuid?: string; categoryUuid?: string; limit?: number; offset?: number }) =>
    api.get<Paginated<import('../types').RankingEntry>>('/rankings', {
      params: { trailUuid, ...options },
    }),
}

// Race sessions & live positions
export const racesApi = {
  sessions: (trailUuid: string, options?: { limit?: number; offset?: number }) =>
    api.get<Paginated<import('../types').RaceSession>>('/races/sessions', { params: { trailUuid, ...options } }),
  livePositions: (trailUuid: string, sessionUuid?: string) =>
    api.get<import('../types').LivePosition[]>('/races/live', { params: { trailUuid, sessionUuid } }),
  routeHistory: (trailId: string, userUuid: string) =>
    api.get<any[]>(`/races/${trailId}/route-history/${userUuid}`),
  events: (trailId: string, sessionUuid?: string) =>
    api.get<import('../types').RaceEvent[]>(`/races/${trailId}/events`, { params: sessionUuid ? { sessionUuid } : {} }),
  deleteSession: (sessionUuid: string) =>
    api.delete(`/races/sessions/${sessionUuid}`),
  replay: (trailId: string, sessionUuid?: string) =>
    api.get<import('../types').ReplayData>(`/races/${trailId}/replay`, { params: sessionUuid ? { sessionUuid } : {} }),
}
