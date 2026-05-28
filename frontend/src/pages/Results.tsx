import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

import { rankingsApi, racesApi, trailsApi, categoriesApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { Category, RankingEntry, RaceSession, TrailWithWaypoints, Waypoint } from '../types'

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

// Build all possible segments using all waypoints (not just those the runner reached)
// Returns speed for each segment, or null if data is missing
function buildAllSegments(runner: RankingEntry | null, waypoints: Waypoint[]): (SpeedSegment | null)[] {
  if (!runner) return waypoints.slice(0, -1).map(() => null)
  const sorted = [...waypoints].sort((a, b) => a.order - b.order)
  return sorted.slice(0, -1).map((wpA, i) => {
    const wpB = sorted[i + 1]
    const timeA = runner.waypointTimes?.find(t => t.waypointUuid === wpA.waypointUuid)
    const timeB = runner.waypointTimes?.find(t => t.waypointUuid === wpB.waypointUuid)
    if (!timeA || !timeB) return null
    const distKm = haversineKm(wpA.lat, wpA.lon, wpB.lat, wpB.lon)
    const timeHours = (timeB.timestamp - timeA.timestamp) / 3_600_000
    if (timeHours <= 0) return null
    const nameA = wpA.name || `WP${wpA.order + 1}`
    const nameB = wpB.name || `WP${wpB.order + 1}`
    return {
      label: nameB,
      fullLabel: `${nameA} → ${nameB}`,
      speed: Math.round((distKm / timeHours) * 10) / 10,
      distanceKm: Math.round(distKm * 100) / 100,
      timeMin: Math.round((timeB.timestamp - timeA.timestamp) / 6000) / 10,
    }
  })
}

function SpeedCompareChart({ segA, segB, nameA, nameB, waypoints }: {
  segA: (SpeedSegment | null)[]
  segB: (SpeedSegment | null)[]
  nameA: string
  nameB?: string
  waypoints: Waypoint[]
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const comparing = !!nameB
  const sorted = [...waypoints].sort((a, b) => a.order - b.order)

  const W = 600, H = 200, padL = 44, padR = 12, padT = 12, padB = 72
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const n = sorted.length - 1
  const slotW = chartW / Math.max(n, 1)
  const barW = Math.min(comparing ? slotW / 2 - 3 : slotW - 6, comparing ? 22 : 48)
  const yTicks = 4

  const allSpeeds = [...segA, ...segB].filter(Boolean).map(s => s!.speed)
  const maxSpeed = Math.max(...allSpeeds, 1)
  const avgA = segA.filter(Boolean).reduce((s, x) => s + x!.speed, 0) / (segA.filter(Boolean).length || 1)

  const colA = (speed: number) => speed >= avgA ? '#16a34a' : '#4ade80'
  const colB = '#3b82f6'

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: Math.max(n * (comparing ? 52 : 40) + padL + padR, 300) }}>
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
        {/* avg A line */}
        <line x1={padL} x2={W - padR} y1={padT + chartH - (avgA / maxSpeed) * chartH}
          y2={padT + chartH - (avgA / maxSpeed) * chartH} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />

        {Array.from({ length: n }, (_, i) => {
          const sA = segA[i]
          const sB = segB[i]
          const slotX = padL + slotW * i
          const xA = comparing ? slotX + slotW / 2 - barW - 1 : slotX + (slotW - barW) / 2
          const xB = slotX + slotW / 2 + 1
          const isHov = hovered === i
          const labelX = slotX + slotW / 2
          const labelY = padT + chartH + 10

          const wpB_name = sorted[i + 1]
          const segLabel = wpB_name ? (wpB_name.name || `WP${wpB_name.order + 1}`) : ''

          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
              {/* bar A */}
              {sA && (() => {
                const bh = Math.max((sA.speed / maxSpeed) * chartH, 2)
                const y = padT + chartH - bh
                return (
                  <rect x={xA} y={y} width={barW} height={bh}
                    fill={colA(sA.speed)} opacity={isHov ? 1 : 0.85} rx="2" ry="2" />
                )
              })()}
              {/* bar B */}
              {comparing && sB && (() => {
                const bh = Math.max((sB.speed / maxSpeed) * chartH, 2)
                const y = padT + chartH - bh
                return (
                  <rect x={xB} y={y} width={barW} height={bh}
                    fill={colB} opacity={isHov ? 1 : 0.75} rx="2" ry="2" />
                )
              })()}
              {/* hover outline */}
              {isHov && <rect x={slotX + 1} y={padT} width={slotW - 2} height={chartH} fill="#f8fafc" opacity="0.5" rx="3" />}
              <text x={labelX} y={labelY} textAnchor="end" fontSize="10" fill="#64748b"
                transform={`rotate(-38, ${labelX}, ${labelY})`}>{segLabel}</text>
            </g>
          )
        })}
        <text x={10} y={padT + chartH / 2} textAnchor="middle" fontSize="10" fill="#94a3b8"
          transform={`rotate(-90, 10, ${padT + chartH / 2})`}>km/h</text>
      </svg>

      {hovered !== null && (segA[hovered] || segB[hovered]) && (
        <div className="absolute top-2 right-2 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs pointer-events-none min-w-[140px]">
          {segA[hovered] && (
            <div className="mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 mr-1.5 align-middle" />
              <span className="font-semibold text-slate-700">{nameA}: </span>
              <span className="text-green-700 font-bold">{segA[hovered]!.speed} km/h</span>
              <span className="text-slate-400 ml-1">{segA[hovered]!.timeMin} min</span>
            </div>
          )}
          {comparing && segB[hovered] && (
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1.5 align-middle" />
              <span className="font-semibold text-slate-700">{nameB}: </span>
              <span className="text-blue-600 font-bold">{segB[hovered]!.speed} km/h</span>
              <span className="text-slate-400 ml-1">{segB[hovered]!.timeMin} min</span>
            </div>
          )}
          {comparing && segA[hovered] && segB[hovered] && (
            <div className="mt-1 pt-1 border-t border-slate-100 text-slate-500">
              Δ {Math.abs(Math.round((segA[hovered]!.speed - segB[hovered]!.speed) * 10) / 10)} km/h
              {segA[hovered]!.speed > segB[hovered]!.speed ? ` (${nameA.split(' ')[0]} más rápido)` : ` (${nameB!.split(' ')[0]} más rápido)`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SpeedChartModal({ runner, waypoints, allRunners, onClose }: {
  runner: RankingEntry
  waypoints: Waypoint[]
  allRunners: RankingEntry[]
  onClose: () => void
}) {
  const [compareUuid, setCompareUuid] = useState('')
  const compareRunner = allRunners.find(r => r.userUuid === compareUuid) ?? null

  const segA = buildAllSegments(runner, waypoints)
  const segB = buildAllSegments(compareRunner, waypoints)

  const validA = segA.filter(Boolean) as SpeedSegment[]
  const validB = segB.filter(Boolean) as SpeedSegment[]
  const avgA = validA.length ? Math.round(validA.reduce((s, x) => s + x.speed, 0) / validA.length * 10) / 10 : 0
  const avgB = validB.length ? Math.round(validB.reduce((s, x) => s + x.speed, 0) / validB.length * 10) / 10 : 0
  const maxA = validA.length ? Math.max(...validA.map(s => s.speed)) : 0
  const maxB = validB.length ? Math.max(...validB.map(s => s.speed)) : 0

  const hasData = validA.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Velocidad por tramo</h2>
            <p className="text-sm text-slate-500">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 mr-1 align-middle" />
              {runner.userName}
              {compareRunner && (
                <>
                  <span className="mx-2 text-slate-300">vs</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1 align-middle" />
                  {compareRunner.userName}
                </>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5">
          {/* Compare selector */}
          <div className="flex items-center gap-2 mb-5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Comparar con:</span>
            <select
              value={compareUuid}
              onChange={e => setCompareUuid(e.target.value)}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">— Sin comparación</option>
              {allRunners.filter(r => r.userUuid !== runner.userUuid).map(r => (
                <option key={r.userUuid} value={r.userUuid}>{r.userName}</option>
              ))}
            </select>
          </div>

          {!hasData ? (
            <p className="text-center text-slate-400 py-10">No hay suficientes datos para calcular velocidades.</p>
          ) : (
            <>
              {/* Stats */}
              <div className={`grid gap-3 mb-5 ${compareRunner ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                  <p className="text-xs text-green-600 uppercase font-semibold tracking-wide truncate">{runner.userName.split(' ')[0]}</p>
                  <p className="text-xl font-bold text-green-800 mt-1">{avgA} <span className="text-xs font-normal text-green-500">km/h</span></p>
                  <p className="text-xs text-green-500">máx {maxA}</p>
                </div>
                {compareRunner ? (
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                    <p className="text-xs text-blue-600 uppercase font-semibold tracking-wide truncate">{compareRunner.userName.split(' ')[0]}</p>
                    <p className="text-xl font-bold text-blue-800 mt-1">{avgB} <span className="text-xs font-normal text-blue-400">km/h</span></p>
                    <p className="text-xs text-blue-400">máx {maxB}</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Más rápido</p>
                      <p className="text-xl font-bold text-slate-800 mt-1">{maxA} <span className="text-xs font-normal text-slate-400">km/h</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Tramos</p>
                      <p className="text-xl font-bold text-slate-800 mt-1">{validA.length}</p>
                    </div>
                  </>
                )}
              </div>

              <SpeedCompareChart
                segA={segA} segB={segB}
                nameA={runner.userName} nameB={compareRunner?.userName}
                waypoints={waypoints}
              />
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
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rankingsError, setRankingsError] = useState<string | null>(null)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)
  const [selectedRunner, setSelectedRunner] = useState<RankingEntry | null>(null)

  useEffect(() => {
    if (!id) return
    setError(null)
    Promise.all([
      trailsApi.details(id),
      racesApi.sessions(id, { limit: SESSIONS_LIMIT, offset: 0 }),
      categoriesApi.list(),
    ]).then(([t, s, c]) => {
        setTrail(t.data)
        setSessions(s.data.data)
        setSessionsTotal(s.data.total)
        setSessionsOffset(0)
        if (s.data.data.length > 0) setSelectedSession(s.data.data[0].sessionUuid)
        setCategories(c.data)
      })
      .catch(() => setError('No se pudo cargar la carrera. Verificá tu conexión e intentá de nuevo.'))
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setRankingsError(null)
    setRankingsOffset(0)
    rankingsApi.get(id, {
      sessionUuid: selectedSession ?? undefined,
      categoryUuid: selectedCategory || undefined,
      limit: RANKINGS_LIMIT,
      offset: 0,
    })
      .then(r => { setRankings(r.data.data); setRankingsTotal(r.data.total) })
      .catch(() => setRankingsError('No se pudieron cargar los resultados.'))
      .finally(() => setLoading(false))
  }, [id, selectedSession, selectedCategory])

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
    rankingsApi.get(id, { sessionUuid: selectedSession ?? undefined, categoryUuid: selectedCategory || undefined, limit: RANKINGS_LIMIT, offset: nextOffset })
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <p className="text-slate-700 font-medium">{error}</p>
        <button onClick={() => { setError(null); window.location.reload() }} className="btn-primary text-sm py-2 px-4">
          Reintentar
        </button>
      </div>
    )
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
        <div className="flex gap-2 flex-shrink-0">
          <Link
            to={`/races/${id}/replay${selectedSession ? `?session=${selectedSession}` : ''}`}
            className="btn-ghost text-sm py-2 px-4"
          >
            ▶ Replay
          </Link>
          <Link
            to={`/races/${id}/live`}
            className="btn-primary text-sm py-2 px-4"
          >
            Ver en vivo
          </Link>
        </div>
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

      {categories.length > 0 && (
        <div className="card p-3 mb-4 flex items-center gap-3">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Categoría:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => (
              <option key={c.categoryUuid} value={c.categoryUuid}>
                {c.name}{c.memberCount > 0 ? ` (${c.memberCount})` : ''}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory('')}
              title="Limpiar filtro"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rankingsError ? (
        <div className="card flex items-center gap-4 p-5 border-l-4 border-red-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <p className="text-slate-700 text-sm flex-1">{rankingsError}</p>
          <button
            onClick={() => { setRankingsError(null); setSelectedSession(s => s) }}
            className="text-sm text-green-600 hover:text-green-700 font-semibold whitespace-nowrap"
          >
            Reintentar
          </button>
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
          allRunners={rankings}
          onClose={() => setSelectedRunner(null)}
        />
      )}
    </div>
  )
}
