export interface User {
  uuid: string
  user: string
  nombre: string
  team: string
  uuid_team: string
  role: 'runner' | 'organizer' | 'spectator' | 'superuser'
  teamStatus?: 'pending' | 'accepted' | 'rejected' | 'none'
}

export interface Trail {
  trailUuid: string
  name: string
  description: string
  distanceKm: number
  elevationM: number
  maxSkip: number
  createdBy: string
  isActive: boolean
  startDate?: string
}

export interface Waypoint {
  waypointUuid: string
  trailUuid: string
  order: number
  name: string
  lat: number
  lon: number
  radius: number
}

export interface TrailWithWaypoints extends Trail {
  waypoints: Waypoint[]
}

export interface RankingEntry {
  userUuid: string
  userName: string
  teamName: string
  waypointsReached: number
  totalWaypoints: number
  lastWaypointTime: number
  totalTime: number
  isCompleted: boolean
  isAbandoned: boolean
  sos?: boolean
  activityType?: 'runner' | 'bike' | 'car'
  waypointTimes?: {
    waypointUuid: string
    timestamp: number
    timeFromStart: number
  }[]
  nextWaypoint?: string
  eta?: number | null
}

export interface LivePosition {
  userUuid: string
  userName: string
  teamName: string
  lat: number
  lon: number
  timestamp: number
  accuracy?: number
  isOnline: boolean
  sos?: boolean
  activityType?: 'runner' | 'bike' | 'car'
}

export interface RaceSession {
  sessionUuid: string
  startTime: number
  runnerCount: number
}

export interface RaceEvent {
  runUuid: string
  userUuid: string
  userName: string
  teamName: string
  type: 'completed' | 'abandoned' | 'sos'
  endTime: number | null
  startTime: number | null
}

export interface ReplayRunner {
  userUuid: string
  userName: string
  teamName: string
  activityType: 'runner' | 'bike' | 'car'
  isCompleted: boolean
  isAbandoned: boolean
  sos: boolean
  positions: { lat: number; lon: number; timestamp: number }[]
}

export interface ReplayData {
  runners: ReplayRunner[]
  startTime: number
  endTime: number
}

export interface Category {
  categoryUuid: string
  name: string
  description: string | null
  memberCount: number
}

export interface AuthResponse {
  token: string
  user: User
}

export interface RunHistoryEntry {
  runUuid: string
  trailUuid: string
  trailName: string
  distanceKm: number
  elevationM: number
  startTime: number | null
  endTime: number | null
  totalTime: number
  isCompleted: number
  isAbandoned: number
  sos: number
  waypointsReached: number
  totalWaypoints: number
}

export type Paginated<T> = { data: T[]; total: number; limit: number; offset: number }
