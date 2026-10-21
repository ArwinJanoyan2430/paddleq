import { useCallback, useEffect, useState } from 'react'
import { Archive, CalendarDays, Clock, Users, Trophy, Trash2 } from 'lucide-react'
import { getSupabaseError, supabase, TABLES } from '../lib/supabase'

function History() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const loadHistory = useCallback(async () => {
    try {
      const { data: rows, error: sessionsError } = await supabase
        .from(TABLES.sessions).select('*').order('created_at', { ascending: false })
      if (sessionsError) throw sessionsError
      const sessionRows = rows || []
      if (!sessionRows.length) {
        setSessions([])
        setError('')
        return
      }

      const ids = sessionRows.map((session) => session.id)
      const [playersResult, matchesResult] = await Promise.all([
        supabase.from(TABLES.players).select('session_id').in('session_id', ids),
        supabase.from(TABLES.matches).select('session_id').in('session_id', ids),
      ])
      if (playersResult.error) throw playersResult.error
      if (matchesResult.error) throw matchesResult.error

      const countBySession = (items) => (items || []).reduce((counts, item) => {
        counts[item.session_id] = (counts[item.session_id] || 0) + 1
        return counts
      }, {})
      const playerCounts = countBySession(playersResult.data)
      const matchCounts = countBySession(matchesResult.data)
      setSessions(sessionRows.map((session) => ({
        id: session.id,
        name: session.name,
        date: session.session_date,
        duration: session.completed_at
          ? `${Math.max(1, Math.round((new Date(session.completed_at) - new Date(session.created_at)) / 60000))} min`
          : 'In progress',
        players: playerCounts[session.id] || 0,
        matches: matchCounts[session.id] || 0,
        status: session.status === 'completed' ? 'Completed' : 'Active',
      })))
      setError('')
    } catch (queryError) {
      setError(getSupabaseError(queryError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const refresh = async () => {
      if (!active) return
      await loadHistory()
    }
    const timer = setTimeout(refresh, 0)
    const channel = supabase.channel('paddleq-session-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.sessions }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.players }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.matches }, refresh)
      .subscribe()
    return () => { active = false; clearTimeout(timer); channel.unsubscribe() }
  }, [loadHistory])

  const totalPlayers = sessions.reduce((total, session) => total + session.players, 0)
  const totalMatches = sessions.reduce((total, session) => total + session.matches, 0)

  async function deleteSession(session) {
    const confirmed = window.confirm(
      `Permanently delete “${session.name}” and all its players, matches, and results? This cannot be undone.`,
    )
    if (!confirmed || deletingId) return
    setDeletingId(session.id)
    setError('')
    try {
      const { data, error: deleteError } = await supabase.from(TABLES.sessions)
        .delete().eq('id', session.id).select('id')
      if (deleteError) throw deleteError
      if (!data?.length) throw new Error('Session was not deleted. Check the database policies and try again.')
      setSessions((current) => current.filter((item) => item.id !== session.id))
    } catch (deleteError) {
      setError(getSupabaseError(deleteError))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-lime-200"><Archive size={23} /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">Session records</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Session History</h1><p className="mt-1 text-sm text-white/80 sm:text-base">Review sessions, players, match results, and activity.</p></div>
          </div>
        </section>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Summary icon={<CalendarDays size={20} />} label="Total sessions" value={sessions.length} />
          <Summary icon={<Users size={20} />} label="Player appearances" value={totalPlayers} />
          <Summary icon={<Trophy size={20} />} label="Total matches" value={totalMatches} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Sessions</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{sessions.length} records</span>
          </div>
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading session history…</p> : sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">No sessions found</p>
              <p className="mt-1 text-sm text-slate-500">Sessions will appear here after one is created.</p>
            </div>
          ) : <div className="space-y-3">
            {sessions.map((session) => <article key={session.id} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/20 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{session.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><CalendarDays size={15} />{session.date}</span>
                    <span className="flex items-center gap-1.5"><Clock size={15} />{session.duration}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${session.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{session.status}</span>
                  <button type="button" onClick={() => deleteSession(session)} disabled={deletingId !== null} aria-label={`Delete ${session.name} and all related data`} className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                    {deletingId === session.id ? <span className="text-xs">Deleting…</span> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div><p className="text-xs text-slate-500">Players</p><p className="mt-1 text-sm font-semibold text-slate-900">{session.players}</p></div>
                <div><p className="text-xs text-slate-500">Matches</p><p className="mt-1 text-sm font-semibold text-slate-900">{session.matches}</p></div>
              </div>
            </article>)}
          </div>}
        </section>
      </div>
    </main>
  )
}

function Summary({ icon, label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{icon}</div><div><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-semibold text-slate-900">{value}</p></div></div></div>
}

export default History
