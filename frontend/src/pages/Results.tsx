import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { rankingsApi, trailsApi } from '../services/api'
import type { RankingEntry, Trail } from '../types'

function formatTime(ms: number) {
  if (!ms) return '--:--:--'
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
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

function ResultRow({ r, pos }: { r: RankingEntry; pos: number }) {
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
      <tr className="hidden sm:table-row hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3.5 text-center">
          {pos < 3
            ? <span className="text-lg">{medals[pos]}</span>
            : <span className="text-sm font-bold text-slate-400">{pos + 1}</span>}
        </td>
        <td className="px-4 py-3.5">
          <p className="font-semibold text-slate-900 text-sm">{r.userName}</p>
          <p className="text-xs text-slate-400">{r.teamName}</p>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${r.isAbandoned ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-500 w-14 text-right">{r.waypointsReached}/{r.totalWaypoints}</span>
          </div>
        </td>
        <td className="px-4 py-3.5 text-right font-mono text-sm text-slate-700">{formatTime(r.totalTime)}</td>
        <td className="px-4 py-3.5 text-center">
          {getStatusBadge()}
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="sm:hidden">
        <td colSpan={5} className="px-4 py-2">
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl flex-shrink-0">
                {pos < 3 ? medals[pos] : <span className="text-sm font-bold text-slate-400 w-6 text-center inline-block">{pos + 1}</span>}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{r.userName}</p>
                <p className="text-xs text-slate-400">{r.teamName}</p>
              </div>
              {getMobileStatusBadge()}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${r.isAbandoned ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-slate-500">{r.waypointsReached}/{r.totalWaypoints} WP</span>
              <span className="text-xs font-mono font-semibold text-slate-700">{formatTime(r.totalTime)}</span>
            </div>
          </div>
        </td>
      </tr>
    </>
  )
}

export default function Results() {
  const { id } = useParams<{ id: string }>()
  const [trail, setTrail] = useState<Trail | null>(null)
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([trailsApi.details(id), rankingsApi.get(id)])
      .then(([t, r]) => { setTrail(t.data); setRankings(r.data) })
      .finally(() => setLoading(false))
  }, [id])

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
          </div>
        </div>
        <Link
          to={`/races/${id}/live`}
          className="btn-primary flex-shrink-0 text-sm py-2 px-4"
        >
          Ver en vivo
        </Link>
      </div>

      {rankings.length === 0 ? (
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
                  <ResultRow key={r.userUuid} r={r} pos={i} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
