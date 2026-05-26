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
  register: (data: { user: string; passw: string; nombre: string; team?: string; uuid_team?: string; role?: string }) =>
    api.post<{ token: string; user: import('../types').User }>('/auth/register', data),
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

// Rankings
export const rankingsApi = {
  get: (trailUuid: string, options?: { teamUuid?: string; sessionUuid?: string }) =>
    api.get<import('../types').RankingEntry[]>('/rankings', {
      params: { trailUuid, ...options },
    }),
}

// Race sessions & live positions
export const racesApi = {
  sessions: (trailUuid: string) =>
    api.get<import('../types').RaceSession[]>('/races/sessions', { params: { trailUuid } }),
  livePositions: (trailUuid: string, sessionUuid?: string) =>
    api.get<import('../types').LivePosition[]>('/races/live', { params: { trailUuid, sessionUuid } }),
  routeHistory: (trailId: string, userUuid: string) =>
    api.get<any[]>(`/races/${trailId}/route-history/${userUuid}`),
  events: (trailId: string, sessionUuid?: string) =>
    api.get<import('../types').RaceEvent[]>(`/races/${trailId}/events`, { params: sessionUuid ? { sessionUuid } : {} }),
  deleteSession: (sessionUuid: string) =>
    api.delete(`/races/sessions/${sessionUuid}`),
}
