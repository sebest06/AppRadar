import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { trailsApi, rankingsApi, racesApi } from '../services/api'
import { joinRace, leaveRace, onPositionUpdate, offPositionUpdate, onRaceUpdate, offRaceUpdate } from '../services/socket'
import { useAuthStore } from '../store/authStore'
import type { TrailWithWaypoints, LivePosition, RankingEntry, RaceSession } from '../types'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const runnerIcon = (name: string, isOnline: boolean) =>
  L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="background:${isOnline ? '#16a34a' : '#64748b'};color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25)">🏃</div>
      <div style="background:${isOnline ? '#0f172a' : '#475569'};color:white;border-radius:4px;padding:1px 5px;font-size:10px;font-weight:600;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis">${name}</div>
      <div style="background:${isOnline ? '#16a34a' : '#94a3b8'};color:white;border-radius:3px;padding:0 4px;font-size:9px;font-weight:700">${isOnline ? '● GPS' : '◎ WP'}</div>
    </div>`,
    className: '',
    iconSize: [60, 58],
    iconAnchor: [30, 17],
  })

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

function LeaderboardPanel({
  rankings,
  positions,
  teamFilter,
  onTeamFilterChange,
  userTeamUuid,
}: {
  rankings: RankingEntry[]
  positions: Map<string, LivePosition>
  teamFilter: 'general' | 'team'
  onTeamFilterChange: (v: 'general' | 'team') => void
  userTeamUuid: string | undefined
}) {
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
              return (
                <div
                  key={r.userUuid}
                  className={`rounded-xl border p-3 transition-all ${
                    pos?.isOnline ? 'border-green-200 bg-green-50' : pos ? 'border-amber-100 bg-amber-50' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base w-6 text-center flex-shrink-0">
                      {medal ?? <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{r.userName}</p>
                      <p className="text-xs text-slate-400 truncate">{r.teamName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {pos?.isOnline && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="live-dot relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"/>
                          </span>
                          {timeAgo(pos.timestamp)}
                        </span>
                      )}
                      {pos && !pos.isOnline && (
                        <span className="text-xs text-amber-600 font-medium">◎ WP · {timeAgo(pos.timestamp)}</span>
                      )}
                      {r.isCompleted && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">✓ Fin</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="flex-shrink-0 font-medium">{r.waypointsReached}/{r.totalWaypoints} WP</span>
                    <span className="flex-shrink-0 font-mono">{formatTime(r.totalTime)}</span>
                  </div>
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
  const [positions, setPositions] = useState<Map<string, LivePosition>>(new Map())
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'map' | 'board'>('map')
  const [teamFilter, setTeamFilter] = useState<'general' | 'team'>('general')
  const rankTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const posTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load trail details
  useEffect(() => {
    if (!id) return
    trailsApi.details(id).then((r) => setTrail(r.data)).finally(() => setLoading(false))
  }, [id])

  // Load sessions and pick the latest
  useEffect(() => {
    if (!id) return
    racesApi.sessions(id).then((r) => {
      setSessions(r.data)
      if (r.data.length > 0) setActiveSession(r.data[0].sessionUuid)
    }).catch(() => {})
  }, [id])

  // Poll rankings (session + team filter aware)
  useEffect(() => {
    if (!id) return
    const teamUuid = teamFilter === 'team' ? user?.uuid_team : undefined
    const fetch = () =>
      rankingsApi.get(id, { sessionUuid: activeSession ?? undefined, teamUuid }).then((r) => setRankings(r.data)).catch(() => {})
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

  // Socket.IO — real-time GPS updates
  useEffect(() => {
    if (!id || !token) return
    const onPos = (p: LivePosition) => {
      setConnected(true)
      setPositions((m) => {
        const existing = m.get(p.userUuid)
        if (existing && existing.timestamp > p.timestamp) return m
        return new Map(m).set(p.userUuid, { ...p, isOnline: true })
      })
    }
    const onRank = (r: RankingEntry[]) => setRankings(r)
    onPositionUpdate(onPos)
    onRaceUpdate(onRank)
    joinRace(id, token)
    return () => { offPositionUpdate(onPos); offRaceUpdate(onRank); leaveRace(id) }
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

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
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
              onChange={(e) => setActiveSession(e.target.value)}
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
            {t === 'map' ? '🗺️ Mapa' : `🏆 Clasificación ${rankings.length > 0 ? `(${rankings.length})` : ''}`}
          </button>
        ))}
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

            {Array.from(positions.values()).map((pos) => (
              <Marker key={pos.userUuid} position={[pos.lat, pos.lon]} icon={runnerIcon(pos.userName.split(' ')[0], pos.isOnline)}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{pos.userName}</p>
                    <p className="text-slate-500">{pos.teamName}</p>
                    <p className={`text-xs mt-1 font-semibold ${pos.isOnline ? 'text-green-600' : 'text-amber-600'}`}>
                      {pos.isOnline ? '● GPS en vivo' : '◎ Último waypoint'}
                    </p>
                    <p className="text-slate-400 text-xs">Actualizado hace {timeAgo(pos.timestamp)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
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
          />
        </div>
      </div>
    </div>
  )
}
