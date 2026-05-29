import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { trailsApi, rankingsApi, racesApi } from '../services/api'
import { joinRace, leaveRace, onPositionUpdate, offPositionUpdate, onRaceUpdate, offRaceUpdate, onRaceEvent, offRaceEvent, onSocketConnect, offSocketConnect, onSocketDisconnect, offSocketDisconnect, onSocketError, offSocketError } from '../services/socket'
import { useAuthStore } from '../store/authStore'
import type { TrailWithWaypoints, LivePosition, RankingEntry, RaceSession, Waypoint } from '../types'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const runnerIcon = (name: string, isOnline: boolean, status?: 'completed' | 'abandoned' | 'sos', activityType?: 'runner' | 'bike' | 'car') => {
  const isSos = status === 'sos'
  const color = isSos ? '#ef4444' : status === 'completed' ? '#2563eb' : status === 'abandoned' ? '#dc2626' : isOnline ? '#16a34a' : '#64748b'

  const iconMap = {
    runner: '🏃',
    bike: '🚲',
    car: '🚗'
  }

  const emoji = isSos ? '🆘' : status === 'completed' ? '🏆' : status === 'abandoned' ? '🛑' : iconMap[activityType || 'runner']

  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px" class="${isSos ? 'sos-animate' : ''}">
      <div style="background:${color};color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25)">${emoji}</div>
      <div style="background:${status && !isSos ? color : (isOnline ? '#0f172a' : '#475569')};color:white;border-radius:4px;padding:1px 5px;font-size:10px;font-weight:600;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis">${name}</div>
      <div style="background:${isSos ? '#ef4444' : (isOnline ? '#16a34a' : '#94a3b8')};color:white;border-radius:3px;padding:0 4px;font-size:9px;font-weight:700">${isSos ? 'S.O.S' : (status ? status.toUpperCase() : (isOnline ? '● GPS' : '◎ WP'))}</div>
    </div>`,
    className: '',
    iconSize: [60, 58],
    iconAnchor: [30, 17],
  })
}

const wpIcon = (order: number) =>
  L.divIcon({
    html: `<div style="background:#f59e0b;color:white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2)">${order}</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })

function formatTime(ms: number) {
  if (!ms) return '--:--:--'
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60) return `${d}s`
  if (d < 3600) return `${Math.floor(d / 60)}min`
  return `${Math.floor(d / 3600)}h`
}

function formatSessionDate(ts: number) {
  return new Date(ts).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatEta(eta: number) {
  return new Date(eta).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function LeaderboardPanel({
  rankings,
  positions,
  teamFilter,
  onTeamFilterChange,
  userTeamUuid,
  waypoints,
  onUserSelect,
}: {
  rankings: RankingEntry[]
  positions: Map<string, LivePosition>
  teamFilter: 'general' | 'team'
  onTeamFilterChange: (v: 'general' | 'team') => void
  userTeamUuid: string | undefined
  waypoints: Waypoint[]
  onUserSelect: (uuid: string | null) => void
}) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {userTeamUuid && (
        <div className="flex-shrink-0 flex px-4 pt-3 pb-2 gap-2">
          {(['general', 'team'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onTeamFilterChange(f)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'general' ? 'General' : 'Mi Equipo'}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm mt-2">Nadie ha comenzado aún</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {rankings.map((r, i) => {
              const pos = positions.get(r.userUuid)
              const pct = r.totalWaypoints > 0 ? (r.waypointsReached / r.totalWaypoints) * 100 : 0
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              const isExpanded = expandedUser === r.userUuid

              return (
                <div
                  key={r.userUuid}
                  onClick={() => {
                    setExpandedUser(isExpanded ? null : r.userUuid)
                    onUserSelect(isExpanded ? null : r.userUuid)
                  }}
                  className={`rounded-xl border p-3 transition-all cursor-pointer ${
                    r.sos ? 'border-red-500 bg-red-50 ring-2 ring-red-500 animate-pulse' :
                    r.isCompleted ? 'border-blue-200 bg-blue-50' :
                    r.isAbandoned ? 'border-red-200 bg-red-50' :
                    pos?.isOnline ? 'border-green-200 bg-green-50' :
                    pos ? 'border-amber-100 bg-amber-50' :
                    'border-slate-100 bg-slate-50'
                  } ${isExpanded ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base w-6 text-center flex-shrink-0">
                      {r.sos ? '🆘' : r.isCompleted ? '🏆' : r.isAbandoned ? '🛑' : medal ?? <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${r.isCompleted ? 'text-blue-900' : r.isAbandoned ? 'text-red-900' : 'text-slate-900'}`}>{r.userName}</p>
                      <p className="text-xs text-slate-400 truncate">{r.teamName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {!r.isCompleted && !r.isAbandoned && (
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                          Próximo: {r.nextWaypoint}
                        </span>
                      )}
                      {!r.isCompleted && !r.isAbandoned && r.eta != null && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${r.eta < Date.now() ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          ETA {formatEta(r.eta)}
                        </span>
                      )}
                      {!r.isCompleted && !r.isAbandoned && pos?.isOnline && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="live-dot relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"/>
                          </span>
                          {timeAgo(pos.timestamp)}
                        </span>
                      )}
                      {!r.isCompleted && !r.isAbandoned && pos && !pos.isOnline && (
                        <span className="text-xs text-amber-600 font-medium">◎ WP · {timeAgo(pos.timestamp)}</span>
                      )}
                      {r.isCompleted && (
                        <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Finalizado</span>
                      )}
                      {r.isAbandoned && (
                        <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Abandonó</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <div className={`${r.isAbandoned ? 'bg-red-400' : r.isCompleted ? 'bg-blue-500' : 'bg-green-500'} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="flex-shrink-0 font-medium">{r.waypointsReached}/{r.totalWaypoints} WP</span>
                    <span className="flex-shrink-0 font-mono">{formatTime(r.totalTime)}</span>
                  </div>

                  {isExpanded && r.waypointTimes && r.waypointTimes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-1.5">
                      {waypoints.map((wp) => {
                        const track = r.waypointTimes?.find(t => t.waypointUuid === wp.waypointUuid)
                        return (
                          <div key={wp.waypointUuid} className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${track ? 'bg-green-500' : 'bg-slate-300'}`} />
                              {wp.name || `WP ${wp.order}`}
                            </span>
                            <span className={`font-mono ${track ? 'text-slate-700 font-bold' : 'text-slate-300'}`}>
                              {track ? formatTime(track.timeFromStart) : '--:--:--'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LiveRace() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuthStore()
  const [trail, setTrail] = useState<TrailWithWaypoints | null>(null)
  const [sessions, setSessions] = useState<RaceSession[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [userPickedSession, setUserPickedSession] = useState(false)
  const [positions, setPositions] = useState<Map<string, LivePosition>>(new Map())
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [trailError, setTrailError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'map' | 'board'>('map')
  const [teamFilter, setTeamFilter] = useState<'general' | 'team'>('general')
  const [selectedUserPath, setSelectedUserPath] = useState<string | null>(null)
  const [userPathData, setUserPathData] = useState<[number, number][]>([])
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: string }[]>([])
  const rankTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const posTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenEvents = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!id || !selectedUserPath) {
      setUserPathData([])
      return
    }
    racesApi.routeHistory(id, selectedUserPath).then(r => {
      setUserPathData(r.data.map((p: any) => [p.lat, p.lon]))
    })
  }, [id, selectedUserPath])

  useEffect(() => {
    if (!id) return
    trailsApi.details(id)
      .then((r) => setTrail(r.data))
      .catch(() => setTrailError(true))
      .finally(() => setLoading(false))
  }, [id])

  // Load sessions on mount + auto-refresh every 30s to detect new race sessions
  useEffect(() => {
    if (!id) return
    const refresh = () => {
      racesApi.sessions(id, { limit: 100 }).then((r) => {
        setSessions(r.data.data)
        // Only auto-select session if user hasn't manually picked one
        if (!userPickedSession && r.data.data.length > 0) {
          setActiveSession(r.data.data[0].sessionUuid)
        }
      }).catch(() => {})
    }
    refresh()
    const timer = setInterval(refresh, 30_000)
    return () => clearInterval(timer)
  }, [id, userPickedSession])

  // Poll rankings (session + team filter aware)
  useEffect(() => {
    if (!id) return
    const teamUuid = teamFilter === 'team' ? user?.uuid_team : undefined
    const fetch = () =>
      rankingsApi.get(id, { sessionUuid: activeSession ?? undefined, teamUuid, limit: 500 }).then((r) => setRankings(r.data.data)).catch(() => {})
    fetch()
    rankTimer.current = setInterval(fetch, 30_000)
    return () => { if (rankTimer.current) clearInterval(rankTimer.current) }
  }, [id, activeSession, teamFilter, user?.uuid_team])

  // Poll live positions every 30s
  useEffect(() => {
    if (!id) return
    const fetch = () =>
      racesApi.livePositions(id, activeSession ?? undefined).then((r) => {
        setPositions((prev) => {
          const next = new Map(prev)
          for (const p of r.data) {
            const existing = prev.get(p.userUuid)
            if (!existing || p.timestamp >= existing.timestamp) {
              next.set(p.userUuid, p)
            }
          }
          return next
        })
      }).catch(() => {})
    fetch()
    posTimer.current = setInterval(fetch, 30_000)
    return () => { if (posTimer.current) clearInterval(posTimer.current) }
  }, [id, activeSession])

  // Socket.IO — real-time updates + connection tracking
  useEffect(() => {
    if (!id || !token) return

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onError = (err: Error) => {
      console.error('[Socket] connect_error:', err.message)
      setConnected(false)
    }

    const onPos = (p: LivePosition) => {
      setPositions((m) => {
        const existing = m.get(p.userUuid)
        if (existing && existing.timestamp > p.timestamp) return m
        return new Map(m).set(p.userUuid, { ...p, isOnline: true })
      })
    }

    const onRank = (r: RankingEntry[]) => setRankings(r)

    const onEvent = (e: { type: string, userName: string }) => {
      const dedupeKey = `${e.userName}:${e.type}`
      if (seenEvents.current.has(dedupeKey)) return
      seenEvents.current.add(dedupeKey)

      const notifId = Math.random().toString(36).slice(2)
      const message = e.type === 'sos'
        ? `🚨 EMERGENCIA: ${e.userName} ha activado el S.O.S!`
        : e.type === 'completed'
        ? `🏆 ${e.userName} ha finalizado la carrera!`
        : `🛑 ${e.userName} ha abandonado.`

      setNotifications(prev => [...prev, { id: notifId, message, type: e.type }])
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notifId))
      }, 5000)
    }

    onSocketConnect(onConnect)
    onSocketDisconnect(onDisconnect)
    onSocketError(onError)
    onPositionUpdate(onPos)
    onRaceUpdate(onRank)
    onRaceEvent(onEvent)
    joinRace(id, token)

    return () => {
      offSocketConnect(onConnect)
      offSocketDisconnect(onDisconnect)
      offSocketError(onError)
      offPositionUpdate(onPos)
      offRaceUpdate(onRank)
      offRaceEvent(onEvent)
      leaveRace(id)
    }
  }, [id, token])

  const onlineCount = useMemo(() => Array.from(positions.values()).filter((p) => p.isOnline).length, [positions])

  const center: [number, number] = trail?.waypoints?.[0]
    ? [trail.waypoints[0].lat, trail.waypoints[0].lon]
    : [-31.4167, -64.1833]

  const routeLine: [number, number][] = trail?.waypoints?.map((w) => [w.lat, w.lon]) ?? []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Cargando carrera...</p>
        </div>
      </div>
    )
  }

  if (trailError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <p className="text-slate-700 font-medium">No se pudo cargar la carrera.<br/>Verificá tu conexión e intentá de nuevo.</p>
        <button onClick={() => window.location.reload()} className="btn-primary text-sm py-2 px-4">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] relative">
      {/* Real-time Notifications */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`px-4 py-3 rounded-lg shadow-xl text-white font-bold text-sm animate-bounce-in pointer-events-auto ${
              n.type === 'sos' ? 'bg-red-500 border-2 border-white animate-pulse' :
              n.type === 'completed' ? 'bg-blue-600' : 'bg-red-600'
            }`}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* Disconnection banner */}
      {!connected && !loading && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <p className="text-amber-800 text-xs font-medium flex-1">
            Sin conexión en tiempo real — los datos pueden estar desactualizados. Reconectando...
          </p>
        </div>
      )}

      {/* Header bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <Link to="/" className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
          </Link>
          <h1 className="font-bold text-slate-900 text-base sm:text-lg truncate flex-1">{trail?.name}</h1>

          {/* Session selector */}
          {sessions.length > 1 && (
            <select
              value={activeSession ?? ''}
              onChange={(e) => { setActiveSession(e.target.value); setUserPickedSession(true) }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white"
            >
              {sessions.map((s, i) => (
                <option key={s.sessionUuid} value={s.sessionUuid}>
                  {i === 0 ? '🟢 ' : ''}{formatSessionDate(s.startTime)} · {s.runnerCount} corredores
                </option>
              ))}
            </select>
          )}

          {/* Live badge */}
          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            connected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {connected ? (
              <span className="relative flex h-2 w-2">
                <span className="live-dot relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-300" />
            )}
            {connected ? `${onlineCount} GPS · ${positions.size} total` : `${positions.size} rastreados`}
          </span>

          <Link to={`/races/${id}/notifications`} className="hidden sm:inline-flex btn-ghost text-sm py-1.5 px-3">
            Eventos
          </Link>
          <Link to={`/races/${id}/results`} className="hidden sm:inline-flex btn-ghost text-sm py-1.5 px-3">
            Resultados
          </Link>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="flex-shrink-0 lg:hidden flex bg-white border-b border-slate-100">
        {(['map', 'board'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === t ? 'text-green-700 border-b-2 border-green-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'map' ? '🗺️ Mapa' : `🏆 Ranking ${rankings.length > 0 ? `(${rankings.length})` : ''}`}
          </button>
        ))}
        <div className="w-px bg-slate-100 my-1.5" />
        <Link
          to={`/races/${id}/notifications`}
          className="px-3 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          Eventos
        </Link>
        <Link
          to={`/races/${id}/results`}
          className="px-3 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          Resultados
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-3 lg:gap-0">
        {/* Map */}
        <div className={`lg:col-span-2 ${tab === 'board' ? 'hidden lg:block' : 'block'} h-full`}>
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {routeLine.length > 1 && (
              <Polyline positions={routeLine} color="#16a34a" weight={4} opacity={0.75} />
            )}

            {trail?.waypoints?.map((wp) => (
              <Marker key={wp.waypointUuid} position={[wp.lat, wp.lon]} icon={wpIcon(wp.order)}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{wp.name}</p>
                    <p className="text-slate-500">Waypoint {wp.order} · Radio {wp.radius}m</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {trail?.waypoints?.map((wp) => (
              <Circle key={`r-${wp.waypointUuid}`} center={[wp.lat, wp.lon]} radius={wp.radius}
                color="#f59e0b" fillOpacity={0.06} weight={1} dashArray="4" />
            ))}

            {userPathData.length > 1 && (
              <Polyline positions={userPathData} color="#2563eb" weight={3} dashArray="5, 8" opacity={0.6} />
            )}

            {Array.from(positions.values()).map((pos) => {
              const runnerRank = rankings.find(r => r.userUuid === pos.userUuid)
              const status = runnerRank?.sos ? 'sos' : runnerRank?.isCompleted ? 'completed' : runnerRank?.isAbandoned ? 'abandoned' : undefined

              return (
                <Marker
                  key={pos.userUuid}
                  position={[pos.lat, pos.lon]}
                  icon={runnerIcon(pos.userName.split(' ')[0], pos.isOnline, status as any, pos.activityType as any)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{pos.userName}</p>
                      <p className="text-slate-500">{pos.teamName}</p>
                      <p className={`text-xs mt-1 font-semibold ${
                        status === 'completed' ? 'text-blue-600' :
                        status === 'abandoned' ? 'text-red-600' :
                        pos.isOnline ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {status === 'completed' ? '🏆 Carrera finalizada' :
                         status === 'abandoned' ? '🛑 Abandonó la carrera' :
                         pos.isOnline ? '● GPS en vivo' : '◎ Último waypoint'}
                      </p>
                      <p className="text-slate-400 text-xs">Actualizado hace {timeAgo(pos.timestamp)}</p>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>

        {/* Leaderboard sidebar */}
        <div className={`lg:block lg:border-l lg:border-slate-100 lg:bg-white overflow-hidden ${tab === 'map' ? 'hidden' : 'block'} h-full flex flex-col`}>
          <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm">Clasificación</h2>
            <span className="text-xs text-slate-400">{positions.size} rastreados</span>
          </div>
          <LeaderboardPanel
            rankings={rankings}
            positions={positions}
            teamFilter={teamFilter}
            onTeamFilterChange={setTeamFilter}
            userTeamUuid={user?.uuid_team}
            waypoints={trail?.waypoints || []}
            onUserSelect={setSelectedUserPath}
          />
        </div>
      </div>
    </div>
  )
}
