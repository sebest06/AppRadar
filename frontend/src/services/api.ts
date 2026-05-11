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

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (user: string, passw: string) =>
    api.post<{ token: string; user: import('../types').User }>('/auth/login', { user, passw }),
  register: (data: { user: string; passw: string; nombre: string; team: string; role?: string }) =>
    api.post<{ token: string; user: import('../types').User }>('/auth/register', data),
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

// Rankings
export const rankingsApi = {
  get: (trailUuid: string, teamUuid?: string) =>
    api.get<import('../types').RankingEntry[]>('/rankings', {
      params: { trailUuid, teamUuid },
    }),
}
