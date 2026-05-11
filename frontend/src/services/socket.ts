import { io, Socket } from 'socket.io-client'
import type { LivePosition } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BASE_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })
  }
  return socket
}

export function joinRace(trailUuid: string, token: string) {
  const s = getSocket()
  s.auth = { token }
  s.connect()
  s.emit('join_race', { trailUuid })
}

export function leaveRace(trailUuid: string) {
  const s = getSocket()
  s.emit('leave_race', { trailUuid })
  s.disconnect()
}

export function onPositionUpdate(cb: (pos: LivePosition) => void) {
  getSocket().on('position_broadcast', cb)
}

export function offPositionUpdate(cb: (pos: LivePosition) => void) {
  getSocket().off('position_broadcast', cb)
}

export function onRaceUpdate(cb: (rankings: import('../types').RankingEntry[]) => void) {
  getSocket().on('race_update', cb)
}

export function offRaceUpdate(cb: (rankings: import('../types').RankingEntry[]) => void) {
  getSocket().off('race_update', cb)
}
