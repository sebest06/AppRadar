import { io, Socket } from 'socket.io-client'
import type { LivePosition, RankingEntry } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

let socket: Socket | null = null
let activeJoinHandler: (() => void) | null = null

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

  // Remove previous handler to avoid duplicate joins on re-mount
  if (activeJoinHandler) {
    s.off('connect', activeJoinHandler)
  }

  // Re-join the room on every (re)connect — handles reconnections automatically
  activeJoinHandler = () => {
    s.emit('join_race', { trailUuid })
  }
  s.on('connect', activeJoinHandler)

  if (s.connected) {
    s.emit('join_race', { trailUuid })
  } else {
    s.connect()
  }
}

export function leaveRace(trailUuid: string) {
  const s = getSocket()
  if (activeJoinHandler) {
    s.off('connect', activeJoinHandler)
    activeJoinHandler = null
  }
  if (s.connected) {
    s.emit('leave_race', { trailUuid })
  }
  s.disconnect()
}

export function onPositionUpdate(cb: (pos: LivePosition) => void) {
  getSocket().on('position_broadcast', cb)
}

export function offPositionUpdate(cb: (pos: LivePosition) => void) {
  getSocket().off('position_broadcast', cb)
}

export function onRaceUpdate(cb: (rankings: RankingEntry[]) => void) {
  getSocket().on('race_update', cb)
}

export function offRaceUpdate(cb: (rankings: RankingEntry[]) => void) {
  getSocket().off('race_update', cb)
}

export function onRaceEvent(cb: (event: { type: string; userName: string; trailUuid: string }) => void) {
  getSocket().on('race_event', cb)
}

export function offRaceEvent(cb: (event: { type: string; userName: string; trailUuid: string }) => void) {
  getSocket().off('race_event', cb)
}

export function onNewMessage(cb: (msg: import('../types').MessageDto) => void) {
  getSocket().on('new_message', cb)
}

export function offNewMessage(cb: (msg: import('../types').MessageDto) => void) {
  getSocket().off('new_message', cb)
}

export function onSocketConnect(cb: () => void) {
  getSocket().on('connect', cb)
}

export function offSocketConnect(cb: () => void) {
  getSocket().off('connect', cb)
}

export function onSocketDisconnect(cb: () => void) {
  getSocket().on('disconnect', cb)
}

export function offSocketDisconnect(cb: () => void) {
  getSocket().off('disconnect', cb)
}

export function onSocketError(cb: (err: Error) => void) {
  getSocket().on('connect_error', cb)
}

export function offSocketError(cb: (err: Error) => void) {
  getSocket().off('connect_error', cb)
}
