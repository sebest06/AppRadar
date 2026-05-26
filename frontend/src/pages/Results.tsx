import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

import { rankingsApi, racesApi, trailsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { RankingEntry, RaceSession, TrailWithWaypoints, Waypoint } from '../types'

function formatTime(ms: number) {
  if (!ms) return '--:--:--'
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function exportToCSV(trail: any, data: RankingEntry[]) {
  if (!data.length) return
  const rows = data.map((r, i) => ({
    "Posición": i + 1,
    "Corredor": r.userName,
    "Equipo": r.teamName,
    "Waypoints": `${r.waypointsReached}/${r.totalWaypoints}`,
    "Tiempo": formatTime(r.totalTime),
    "Estado": r.isCompleted ? "Completó" : r.isAbandoned ? "Abandonó" : "En carrera"
  }))

  const csvContent = [
    Object.keys(rows[0]).join(","),
    ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(","))
  ].join("\n")

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `resultados_${trail?.name || 'carrera'}.csv`)
  link.click()
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface SpeedSegment {
  label: string
  fullLabel: string
  speed: number
  distanceKm: number
  timeMin: number
}

function buildSpeedSegments(runner: RankingEntry, waypoints: Waypoint[]): SpeedSegment[] {
  if (!runner.waypointTimes?.length) return []
  const sorted = [...waypoints].sort((a, b) => a.order - b.order)
  const segments: SpeedSegment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const wpA = sorted[i]
    const wpB = sorted[i + 1]
    const timeA = runner.waypointTimes.find(t => t.waypointUuid === wpA.waypointUuid)
    const timeB = runner.waypointTimes.find(t => t.waypointUuid === wpB.waypointUuid)
    if (!timeA || !timeB) continue
    const distKm = haversineKm(wpA.lat, wpA.lon, wpB.lat, wpB.lon)
    const timeHours = (timeB.timestamp - timeA.timestamp) / 3_600_000
    if (timeHours <= 0) continue
    const nameA = wpA.name || `WP${wpA.order + 1}`
    const nameB = wpB.name || `WP${wpB.order + 1}`
    segments.push({
      label: nameB,
      fullLabel: `${nameA} → ${nameB}`,
      speed: Math.round((distKm / timeHours) * 10) / 10,
      distanceKm: Math.round(distKm * 100) / 100,
      timeMin: Math.round((timeB.timestamp - timeA.timestamp) / 6000) / 10,
    })
  }
  return segments
}

function SpeedBarChart({ segments }: { segments: SpeedSegment[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const W = 600
  const H = 200
  const padL = 44
  const padR = 12
  const padT = 12
  const padB = 72
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const maxSpeed = Math.max(...segments.map(s => s.speed), 1)
  const avg = segments.reduce((s, x) => s + x.speed, 0) / segments.length
  const barW = Math.min(chartW / segments.length - 4, 48)
  const yTicks = 4

  function barColor(s: SpeedSegment) {
    if (s.speed === maxSpeed) return '#16a34a'
    if (s.speed >= avg) return '#4ade80'
    return '#86efac'
  }

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: Math.max(segments.length * 40 + padL + padR, 300) }}>
        {/* grid + y-axis */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = Math.round((maxSpeed / yTicks) * i * 10) / 10
          const y = padT + chartH - (val / maxSpeed) * chartH
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val}</text>
            </g>
          )
        })}

        {/* avg line */}
        {(() => {
          const y = padT + chartH - (avg / maxSpeed) * chartH
          return <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />
        })()}

        {/* bars */}
        {segments.map((seg, i) => {
          const x = padL + (chartW / segments.length) * i + (chartW / segments.length - barW) / 2
          const bh = Math.max((seg.speed / maxSpeed) * chartH, 2)
          const y = padT + chartH - bh
          const isHov = hovered === i
          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}
            >
              <rect
                x={x} y={y} width={barW} height={bh}
                fill={barColor(seg)}
                opacity={isHov ? 1 : 0.85}
                rx="3" ry="3"
              />
              {isHov && (
                <rect x={x - 2} y={y - 2} width={barW + 4} height={bh + 2} fill="none"
                  stroke={barColor(seg)} strokeWidth="1.5" rx="4" ry="4" />
              )}
              {/* speed label on top */}
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600">
                {seg.speed}
              </text>
              {/* x label rotated */}
              <text
                x={x + barW / 2} y={padT + chartH + 10}
                textAnchor="end"
                fontSize="10" fill="#64748b"
                transform={`rotate(-38, ${x + barW / 2}, ${padT + chartH + 10})`}
              >
                {seg.label}
              </text>
            </g>
          )
        })}

        {/* y-axis label */}
        <text x={10} y={padT + chartH / 2} textAnchor="middle" fontSize="10" fill="#94a3b8"
          transform={`rotate(-90, 10, ${padT + chartH / 2})`}>km/h</text>
      </svg>

      {/* hover tooltip */}
      {hovered !== null && (
        <div className="absolute top-2 right-2 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs pointer-events-none">
          <p className="font-semibold text-slate-700 mb-0.5">{segments[hovered].fullLabel}</p>
          <p className="text-green-700 font-bold text-sm">{segments[hovered].speed} km/h</p>
          <p className="text-slate-400 mt-0.5">{segments[hovered].distanceKm} km · {segments[hovered].timeMin} min</p>
        </div>
      )}
    </div>
  )
}

function SpeedChartModal({ runner, waypoints, onClose }: { runner: RankingEntry; waypoints: Waypoint[]; onClose: () => void }) {
  const segments = buildSpeedSegments(runner, waypoints)
  const avg = segments.length ? Math.round((segments.reduce((s, x) => s + x.speed, 0) / segments.length) * 10) / 10 : 0
  const max = segments.length ? Math.max(...segments.map(s => s.speed)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{runner.userName}</h2>
            <p className="text-sm text-slate-500">{runner.teamName || 'Sin equipo'} · Velocidad por tramo</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5">
          {segments.length === 0 ? (
            <p className="text-center text-slate-400 py-10">No hay suficientes datos para calcular velocidades.</p>
          ) : (
            <>
              <div className="flex gap-3 mb-5">
                <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Velocidad media</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{avg} <span className="text-sm font-normal text-slate-500">km/h</span></p>
                </div>
                <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 uppercase font-semibold tracking-wide">Tramo más rápido</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{max} <span className="text-sm font-normal text-green-500">km/h</span></p>
                </div>
                <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Tramos</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{segments.length}</p>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1"><span className="inline-block w-8 border-t border-dashed border-amber-400" /> Velocidad media</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-600" /> Más rápido</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-400" /> Sobre media</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-200" /> Bajo media</span>
              </div>

              <SpeedBarChart segments={segments} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Podium({ top3 }: { top3: RankingEntry[] }) {
  const [second, first, third] = [top3[1], top3[0], top3[2]]
  const medals = ['🥇', '🥈', '🥉']
  const heights = ['h-20', 'h-28', 'h-14']
  const order = [second, first, third]

  if (!first) return null

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 text-center">Podio</h2>
      <div className="flex items-end justify-center gap-3">
        {order.map((r, col) => {
          if (!r) return <div key={col} className="w-24" />
          const pos = top3.indexOf(r)
          return (
            <div key={r.userUuid} className="flex flex-col items-center gap-2 w-24">
              <span className="text-2xl">{medals[pos]}</span>
              <div className="text-center">
                <p className="font-bold text-slate-900 text-sm leading-tight truncate w-full">{r.userName.split(' ')[0]}</p>
                <p className="text-xs text-slate-400 truncate">{r.teamName}</p>
              </div>
              <div
                className={`w-full ${heights[col]} rounded-t-xl flex items-center justify-center text-white font-bold text-lg`}
                style={{ background: col === 1 ? 'linear-gradient(180deg, #fbbf24, #f59e0b)' : col === 0 ? 'linear-gradient(180deg, #94a3b8, #64748b)' : 'linear-gradient(180deg, #fb923c, #ea580c)' }}
              >
                {pos + 1}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultRow({ r, pos, waypoints, onSelect }: { r: RankingEntry; pos: number; waypoints: Waypoint[]; onSelect: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const medals = ['🥇', '🥈', '🥉']
  const pct = r.totalWaypoints > 0 ? (r.waypointsReached / r.totalWaypoints) * 100 : 0

  const getStatusBadge = () => {
    if (r.isCompleted) {
      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Completó</span>
    }
    if (r.isAbandoned) {
      return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">✕ Abandonó</span>
    }
    return <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">En carrera</span>
  }

  const getMobileStatusBadge = () => {
    if (r.isCompleted) {
      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓</span>
    }
    if (r.isAbandoned) {
      return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">✕</span>
    }
    return <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">En carrera</span>
  }

  return (
    <>
      {/* Desktop row */}
      <tr
        className={`hidden sm:table-row transition-colors border-l-4 ${
          r.isCompleted ? 'bg-blue-50/30 hover:bg-blue-50 border-blue-500' :
          r.isAbandoned ? 'bg-red-50/30 hover:bg-red-50 border-red-500 opacity-80' :
          'hover:bg-slate-50 border-transparent'
        }`}
      >
        <td className="px-4 py-3.5 text-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {r.isCompleted ? '🏆' : r.isAbandoned ? '🛑' : (pos < 3
            ? <span className="text-lg">{medals[pos]}</span>
            : <span className="text-sm font-bold text-slate-400">{pos + 1}</span>)}
        </td>
        <td className="px-4 py-3.5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <p className={`font-semibold text-sm ${r.isCompleted ? 'text-blue-900' : r.isAbandoned ? 'text-red-900' : 'text-slate-900'}`}>{r.userName}</p>
          <p className="text-xs text-slate-400">{r.teamName}</p>
        </td>
        <td className="px-4 py-3.5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-200/50 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${r.isAbandoned ? 'bg-red-400' : r.isCompleted ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-500 w-14 text-right">{r.waypointsReached}/{r.totalWaypoints}</span>
          </div>
        </td>
        <td className="px-4 py-3.5 text-right font-mono text-sm text-slate-700 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>{formatTime(r.totalTime)}</td>
        <td className="px-4 py-3.5">
          <div className="flex items-center justify-center gap-2">
            {getStatusBadge()}
            <button
              onClick={onSelect}
              title="Ver velocidad por tramo"
              className="p-1 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded row (Desktop) */}
      {isExpanded && (
        <tr className={`hidden sm:table-row ${r.isCompleted ? 'bg-blue-50/50' : r.isAbandoned ? 'bg-red-50/50' : 'bg-slate-50/50'}`}>
          <td colSpan={5} className="px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {waypoints.map((wp) => {
                const track = r.waypointTimes?.find(t => t.waypointUuid === wp.waypointUuid)
                return (
                  <div key={wp.waypointUuid} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 uppercase font-bold truncate mb-1">{wp.name || `WP ${wp.order}`}</p>
                    <p className={`font-mono text-xs ${track ? 'text-green-600 font-bold' : 'text-slate-300'}`}>
                      {track ? formatTime(track.timeFromStart) : '--:--:--'}
                    </p>
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      )}

      {/* Mobile card */}
      <tr className="sm:hidden">
        <td colSpan={5} className="px-4 py-2">
          <div
            className={`card p-4 transition-all border-l-4 ${
              r.isCompleted ? 'border-blue-500 bg-blue-50/30' :
              r.isAbandoned ? 'border-red-500 bg-red-50/30' :
              'border-transparent'
            } ${isExpanded ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl flex-shrink-0">
                {r.isCompleted ? '🏆' : r.isAbandoned ? '🛑' : (pos < 3 ? medals[pos] : <span className="text-sm font-bold text-slate-400 w-6 text-center inline-block">{pos + 1}</span>)}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate ${r.isCompleted ? 'text-blue-900' : r.isAbandoned ? 'text-red-900' : 'text-slate-900'}`}>{r.userName}</p>
                <p className="text-xs text-slate-400">{r.teamName}</p>
              </div>
              {getMobileStatusBadge()}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-200/50 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${r.isAbandoned ? 'bg-red-400' : r.isCompleted ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-slate-500">{r.waypointsReached}/{r.totalWaypoints} WP</span>
              <span className="text-xs font-mono font-semibold text-slate-700">{formatTime(r.totalTime)}</span>
              <button
                onClick={e => { e.stopPropagation(); onSelect() }}
                title="Ver velocidad por tramo"
                className="p-1 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </button>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                {waypoints.map((wp) => {
                  const track = r.waypointTimes?.find(t => t.waypointUuid === wp.waypointUuid)
                  return (
                    <div key={wp.waypointUuid} className="flex flex-col">
                      <span className="text-[10px] text-slate-400 truncate">{wp.name || `WP ${wp.order}`}</span>
                      <span className={`font-mono text-xs ${track ? 'text-green-600 font-bold' : 'text-slate-300'}`}>
                        {track ? formatTime(track.timeFromStart) : '--:--:--'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function Results() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore(s => s.user)
  const canDelete = user?.role === 'organizer' || user?.role === 'superuser'

  const SESSIONS_LIMIT = 20
  const RANKINGS_LIMIT = 50

  const [trail, setTrail] = useState<TrailWithWaypoints | null>(null)
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [rankingsTotal, setRankingsTotal] = useState(0)
  const [rankingsOffset, setRankingsOffset] = useState(0)
  const [sessions, setSessions] = useState<RaceSession[]>([])
  const [sessionsTotal, setSessionsTotal] = useState(0)
  const [sessionsOffset, setSessionsOffset] = useState(0)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)
  const [selectedRunner, setSelectedRunner] = useState<RankingEntry | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([trailsApi.details(id), racesApi.sessions(id, { limit: SESSIONS_LIMIT, offset: 0 })])
      .then(([t, s]) => {
        setTrail(t.data)
        setSessions(s.data.data)
        setSessionsTotal(s.data.total)
        setSessionsOffset(0)
        if (s.data.data.length > 0) setSelectedSession(s.data.data[0].sessionUuid)
      })
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setRankingsOffset(0)
    rankingsApi.get(id, { sessionUuid: selectedSession ?? undefined, limit: RANKINGS_LIMIT, offset: 0 })
      .then(r => { setRankings(r.data.data); setRankingsTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [id, selectedSession])

  function loadMoreSessions() {
    if (!id) return
    const nextOffset = sessionsOffset + SESSIONS_LIMIT
    setLoadingMore(true)
    racesApi.sessions(id, { limit: SESSIONS_LIMIT, offset: nextOffset })
      .then(r => {
        setSessions(prev => [...prev, ...r.data.data])
        setSessionsOffset(nextOffset)
      })
      .finally(() => setLoadingMore(false))
  }

  function loadMoreRankings() {
    if (!id) return
    const nextOffset = rankingsOffset + RANKINGS_LIMIT
    setLoadingMore(true)
    rankingsApi.get(id, { sessionUuid: selectedSession ?? undefined, limit: RANKINGS_LIMIT, offset: nextOffset })
      .then(r => { setRankings(prev => [...prev, ...r.data.data]); setRankingsOffset(nextOffset) })
      .finally(() => setLoadingMore(false))
  }

  async function handleDeleteSession(sessionUuid: string) {
    if (!confirm('¿Borrar esta sesión y todos sus datos? Esta acción no se puede deshacer.')) return
    setDeletingSession(sessionUuid)
    try {
      await racesApi.deleteSession(sessionUuid)
      const remaining = sessions.filter(s => s.sessionUuid !== sessionUuid)
      setSessions(remaining)
      setSessionsTotal(t => t - 1)
      if (selectedSession === sessionUuid) {
        setSelectedSession(remaining.length > 0 ? remaining[0].sessionUuid : null)
      }
    } finally {
      setDeletingSession(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6 flex-wrap">
        <Link to="/" className="text-slate-400 hover:text-slate-600 mt-1 flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{trail?.name}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
            {trail?.distanceKm ? <span>📏 {trail.distanceKm} km</span> : null}
            {trail?.elevationM ? <span>⛰️ +{trail.elevationM} m</span> : null}
            <button
              onClick={() => exportToCSV(trail, rankings)}
              className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-1"
            >
              📥 Descargar CSV
            </button>
          </div>
        </div>
        <Link
          to={`/races/${id}/live`}
          className="btn-primary flex-shrink-0 text-sm py-2 px-4"
        >
          Ver en vivo
        </Link>
      </div>

      {sessions.length > 0 && (
        <div className="card p-3 mb-4 flex items-center gap-3">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Sesión:</span>
          <select
            value={selectedSession ?? ''}
            onChange={e => {
              if (e.target.value === '__load_more__') { loadMoreSessions(); return }
              setSelectedSession(e.target.value)
            }}
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {sessions.map((s, i) => (
              <option key={s.sessionUuid} value={s.sessionUuid}>
                Carrera {sessionsTotal - i} — {formatDate(s.startTime)} ({s.runnerCount} corredor{s.runnerCount !== 1 ? 'es' : ''})
              </option>
            ))}
            {sessions.length < sessionsTotal && (
              <option value="__load_more__" disabled={loadingMore}>
                {loadingMore ? 'Cargando...' : `▼ Ver más sesiones (${sessionsTotal - sessions.length} restantes)`}
              </option>
            )}
          </select>
          {canDelete && selectedSession && (
            <button
              onClick={() => handleDeleteSession(selectedSession)}
              disabled={deletingSession === selectedSession}
              title="Borrar esta sesión"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {deletingSession === selectedSession
                ? <span className="block w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              }
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="card text-center py-16 px-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Sin resultados todavía</h3>
          <p className="text-slate-500 text-sm">La carrera aún no comenzó o no hay datos de corredores.</p>
        </div>
      ) : (
        <>
          <Podium top3={rankings.slice(0, 3)} />

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm">Clasificación general</h2>
              <span className="text-xs text-slate-400">{rankings.length} corredor{rankings.length !== 1 ? 'es' : ''}</span>
            </div>

            <table className="w-full">
              <thead className="hidden sm:table-header-group">
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 text-left">Corredor</th>
                  <th className="px-4 py-3 text-left">Progreso</th>
                  <th className="px-4 py-3 text-right">Tiempo</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 sm:divide-slate-100">
                {rankings.map((r, i) => (
                  <ResultRow key={r.userUuid} r={r} pos={i} waypoints={trail?.waypoints || []} onSelect={() => setSelectedRunner(r)} />
                ))}
              </tbody>
            </table>

            {rankings.length < rankingsTotal && (
              <div className="px-4 py-3 border-t border-slate-100 text-center">
                <button
                  onClick={loadMoreRankings}
                  disabled={loadingMore}
                  className="text-sm text-green-600 hover:text-green-700 font-semibold disabled:opacity-50"
                >
                  {loadingMore ? 'Cargando...' : `Ver más corredores (${rankingsTotal - rankings.length} restantes)`}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {selectedRunner && (
        <SpeedChartModal
          runner={selectedRunner}
          waypoints={trail?.waypoints || []}
          onClose={() => setSelectedRunner(null)}
        />
      )}
    </div>
  )
}
