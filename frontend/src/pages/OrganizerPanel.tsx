import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { rankingsApi, messagesApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { RankingEntry } from '../types'

const STATUS_MAP = {
  sos:       { emoji: '🆘', label: 'SOS activo',  cls: 'bg-red-100 text-red-700' },
  completed: { emoji: '🏁', label: 'Completó',     cls: 'bg-blue-100 text-blue-700' },
  abandoned: { emoji: '🛑', label: 'Abandonó',    cls: 'bg-slate-100 text-slate-500' },
  running:   { emoji: '🏃', label: 'En carrera',   cls: 'bg-green-100 text-green-700' },
} as const

function runnerStatus(r: RankingEntry): keyof typeof STATUS_MAP {
  if (r.sos)         return 'sos'
  if (r.isCompleted) return 'completed'
  if (r.isAbandoned) return 'abandoned'
  return 'running'
}

// ── Message dialog ────────────────────────────────────────────────────────────

function MessageDialog({
  targetName,
  onClose,
  onSend,
}: {
  targetName: string
  onClose: () => void
  onSend: (content: string) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await onSend(text.trim())
      onClose()
    } catch {
      setError('Error al enviar. Intenta de nuevo.')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <h3 className="font-bold text-slate-900 text-lg">Mensaje para: {targetName}</h3>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value.slice(0, 500))}
          placeholder="Escribe el mensaje aquí…"
          rows={4}
          className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{text.length}/500</span>
          {error && <span className="text-red-600">{error}</span>}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Runner row ────────────────────────────────────────────────────────────────

function RunnerRow({
  rank,
  runner,
  onMessage,
}: {
  rank: number
  runner: RankingEntry
  onMessage: () => void
}) {
  const st = STATUS_MAP[runnerStatus(runner)]
  const pct = runner.totalWaypoints > 0
    ? Math.round((runner.waypointsReached / runner.totalWaypoints) * 100)
    : 0

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 font-bold text-slate-500 text-sm w-10">{rank}</td>
      <td className="py-3 px-4">
        <p className="font-semibold text-slate-900 text-sm">{runner.userName}</p>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
          {st.emoji} {st.label}
        </span>
      </td>
      <td className="py-3 px-4 w-40">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {runner.waypointsReached}/{runner.totalWaypoints}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <button
          onClick={onMessage}
          className="text-xs font-semibold text-green-700 hover:text-green-900 border border-green-200 hover:border-green-400 px-2.5 py-1 rounded-lg transition-colors"
        >
          💬 Mensaje
        </button>
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrganizerPanel() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore(s => s.user)
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  // dialog state: null=closed, 'all'=broadcast, string=specific userUuid
  const [dialog, setDialog] = useState<null | 'all' | { uuid: string; name: string }>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isOrganizer = user?.role === 'organizer' || user?.role === 'superuser'

  const load = async () => {
    if (!id) return
    try {
      const res = await rankingsApi.get(id, { limit: 500 })
      setRankings(res.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 10_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [id])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSend = async (recipientUuid: string | null, content: string) => {
    if (!id) return
    await messagesApi.send(id, recipientUuid, content)
    showToast(recipientUuid ? 'Mensaje enviado ✓' : 'Mensaje enviado a todos ✓')
  }

  if (!isOrganizer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-600">Solo los organizadores pueden acceder a este panel.</p>
        <Link to={`/races/${id}/live`} className="text-green-700 underline text-sm">← Volver a la carrera</Link>
      </div>
    )
  }

  const active   = rankings.filter(r => !r.isCompleted && !r.isAbandoned && !r.sos)
  const sos      = rankings.filter(r => r.sos)
  const finished = rankings.filter(r => r.isCompleted)
  const abandoned= rankings.filter(r => r.isAbandoned && !r.sos)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel del Organizador</h1>
          <div className="flex gap-3 mt-1 text-xs text-slate-500">
            <Link to={`/races/${id}/live`} className="hover:text-green-700">← Vista en vivo</Link>
            <span>·</span>
            <Link to={`/races/${id}/results`} className="hover:text-green-700">Resultados</Link>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Quick stats */}
          {[
            { label: 'En carrera', count: active.length,    cls: 'bg-green-50 text-green-700' },
            { label: 'SOS',        count: sos.length,       cls: 'bg-red-50 text-red-700' },
            { label: 'Terminaron', count: finished.length,  cls: 'bg-blue-50 text-blue-700' },
            { label: 'Abandonaron',count: abandoned.length, cls: 'bg-slate-100 text-slate-500' },
          ].map(s => s.count > 0 && (
            <span key={s.label} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
              {s.count} {s.label}
            </span>
          ))}
          <button
            onClick={() => setDialog('all')}
            className="ml-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            📢 Mensaje a todos
          </button>
        </div>
      </div>

      {/* Table */}
      {loading && rankings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Cargando…</div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Sin corredores registrados en esta carrera.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 tracking-wide">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Corredor</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Progreso</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, i) => (
                <RunnerRow
                  key={r.userUuid}
                  rank={i + 1}
                  runner={r}
                  onMessage={() => setDialog({ uuid: r.userUuid, name: r.userName })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Message dialog */}
      {dialog && (
        <MessageDialog
          targetName={dialog === 'all' ? 'todos los corredores' : dialog.name}
          onClose={() => setDialog(null)}
          onSend={content => handleSend(dialog === 'all' ? null : dialog.uuid, content)}
        />
      )}
    </div>
  )
}
