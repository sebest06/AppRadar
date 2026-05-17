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
}

export interface RaceSession {
  sessionUuid: string
  startTime: number
  runnerCount: number
}

export interface AuthResponse {
  token: string
  user: User
}
