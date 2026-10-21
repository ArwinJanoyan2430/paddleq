import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUp, ArrowUpRight, ListOrdered, Medal, Radio, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getActiveSession, getSupabaseError, subscribeToSession } from '../lib/supabase'

export default function LiveQueue() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setSession(await getActiveSession())
      setError('')
    } catch (err) {
      setError(getSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(refresh, 0)
    return () => clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (!session?.id) return undefined
    const channel = subscribeToSession(session.id, refresh)
    return () => channel.unsubscribe()
  }, [session?.id, refresh])

  const players = useMemo(() => session?.players || [], [session])
  const waiting = useMemo(() => players
    .filter((player) => player.status === 'waiting')
    .sort((a, b) => a.queue_position - b.queue_position), [players])
  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player.name])), [players])
  const matches = session?.matches || []
  const activeMatches = matches
    .filter((match) => ['getting_ready', 'in_progress'].includes(match.status))
    .sort((a, b) => a.court_number - b.court_number)
  const visibleMatches = matches
    .filter((match) => match.status !== 'completed')
    .sort((a, b) => a.court_number - b.court_number || a.queue_position - b.queue_position)
  const queuedMatches = matches
    .filter((match) => match.status === 'queued')
    .sort((a, b) => a.queue_position - b.queue_position)
  const queuedUpNext = queuedMatches[0]
    ? [...(queuedMatches[0].team_one_player_ids || []), ...(queuedMatches[0].team_two_player_ids || [])]
    : []
  const upNextIds = queuedUpNext.length
    ? queuedUpNext
    : waiting.slice(0, 4).map((player) => player.id)
  const rankedPlayers = [...players].sort((a, b) => {
    const rateA = a.wins + a.losses ? a.wins / (a.wins + a.losses) : 0
    const rateB = b.wins + b.losses ? b.wins / (b.wins + b.losses) : 0
    return rateB - rateA || a.name.localeCompare(b.name)
  })

  return (
    <main className="min-h-screenpx-4 bg-slate-100 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-2xl px-5 py-7 shadow-md sm:px-8 sm:py-9" style={{ background: 'linear-gradient(110deg, #052e24 0%, #065f46 55%, #0f766e 100%)', color: '#ffffff' }}>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-200"><Radio size={15} className="animate-pulse" /> Courtside board</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Live Queue</h1>
              <p className="mt-2 text-sm text-white/90 sm:text-base">{session ? [session.name, session.club_name].filter(Boolean).join(' · ') : 'Live courts, upcoming players, and session standings.'}</p>
            </div>
            <div className="flex items-center gap-2">
              {session && <span className="inline-flex items-center gap-2 rounded-full border border-lime-200/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-white"><span className="h-2 w-2 rounded-full bg-lime-300" />Session live</span>}
            </div>
          </div>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading && <p className="text-sm text-slate-500">Loading the live board...</p>}

        {!loading && !session ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Activity size={23} /></div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No active session</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Start a session and add players to see the live queue and court activity here.</p>
            <Link to="/set-session" className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Set up session</Link>
          </section>
        ) : session && <>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">On court</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Live matches</h2></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{activeMatches.length} active</span></div>
              {visibleMatches.length ? <div className="mt-5 space-y-3">
                {visibleMatches.map((match) => {
                  const statusLabel = match.status === 'in_progress' ? 'Playing' : match.status === 'queued' ? 'Queued' : 'Getting ready'
                  const statusStyle = match.status === 'in_progress'
                    ? { backgroundColor: '#d9f99d', color: '#123f33' }
                    : match.status === 'queued'
                      ? { backgroundColor: 'rgba(255,255,255,.2)', color: '#ffffff' }
                      : { backgroundColor: '#fde68a', color: '#123f33' }
                  const teamOne = (match.team_one_player_ids || []).map((id) => playerMap.get(id) || 'Player').join(' & ') || 'Team A'
                  const teamTwo = (match.team_two_player_ids || []).map((id) => playerMap.get(id) || 'Player').join(' & ') || 'Team B'

                  return (
                    <article key={match.id} className="rounded-xl border border-emerald-900/20 p-3 shadow-sm sm:p-4" style={{ backgroundColor: '#1e664f', color: '#ffffff' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold tracking-wide">COURT {match.court_number}</h3>
                        <span className="inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold leading-none" style={statusStyle}>{statusLabel}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-white/25 bg-black/10 p-2.5 sm:p-3">
                        <p className="min-w-0 break-words text-center text-xs font-semibold leading-5 sm:text-sm">{teamOne}</p>
                        <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold tracking-wider text-white/80">VS</span>
                        <p className="min-w-0 break-words text-center text-xs font-semibold leading-5 sm:text-sm">{teamTwo}</p>
                      </div>
                    </article>
                  )
                })}
              </div> : <Empty message="No matches assigned yet. The next four waiting players will appear on the court." />}
            </section>

            
            <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Next on court</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Up next</h2><p className="mt-1 text-sm text-slate-500">Players are grouped by doubles team</p></div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{upNextIds.length}/4 players</span>
              </div>
              {upNextIds.length ? <div className="relative mt-5 overflow-hidden rounded-xl p-3 sm:p-4" style={{ backgroundColor: '#28745b' }}>
                <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-white/80" />
                <div className="pointer-events-none absolute inset-y-2 left-1/2 border-l-2 border-white/80" />
                <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t-2 border-white/80" />
                <div className="relative grid grid-cols-2 gap-3 sm:gap-5">
                  {[0, 1].map((teamIndex) => {
                    const teamPlayers = upNextIds.slice(teamIndex * 2, teamIndex * 2 + 2)
                    const teamName = teamIndex === 0 ? 'Team A' : 'Team B'
                    return <div key={teamName} className="min-w-0 rounded-lg border border-white/40 px-2 py-2 shadow-sm sm:px-3" style={{ backgroundColor: '#174b3a', color: '#ffffff' }}>
                      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: '#d1fae5' }}>{teamName}</p>
                      <div className="space-y-1.5">
                        {[0, 1].map((slot) => {
                          const id = teamPlayers[slot]
                          return <div key={id || `waiting-${teamIndex}-${slot}`} className="flex min-w-0 items-center gap-2 rounded-md bg-white/10 px-2 py-1.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: '#d9f99d', color: '#123f33' }}>{teamIndex * 2 + slot + 1}</span>
                            <span className="truncate text-xs font-semibold sm:text-sm">{id ? playerMap.get(id) || 'Player' : 'Waiting'}</span>
                          </div>
                        })}
                      </div>
                    </div>
                  })}
                </div>
              </div> : <Empty message="Waiting for players to join the queue." />}
              {upNextIds.length > 0 && upNextIds.length < 4 && <p className="mt-3 text-xs text-slate-500">Waiting for {4 - upNextIds.length} more player{upNextIds.length === 3 ? '' : 's'}.</p>}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Queue order</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Waiting players</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{waiting.length} waiting</span></div>
              {waiting.length ? <ol className="divide-y divide-slate-100">{waiting.map((player, index) => <li key={player.id} className="flex items-center gap-3 py-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${index < 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{player.name}</span>{index < 4 && <span title="Up next" aria-label="Up next" className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><ArrowUp size={15} strokeWidth={2.5} /></span>}</li>)}</ol> : <Empty message="The waiting list is clear." />}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Session stats</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Win rate</h2></div><TrendingUp className="text-emerald-600" size={20} /></div>
              {rankedPlayers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[350px] text-left"><thead><tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="py-3 pr-2">#</th><th className="py-3">Player</th><th className="py-3 text-center">W-L</th><th className="py-3 text-right">Rate</th></tr></thead><tbody>{rankedPlayers.map((player, index) => { const games = player.wins + player.losses; const rate = games ? player.wins / games : 0; return <tr key={player.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-2 text-sm text-slate-400">{index === 0 ? <Medal size={16} className="text-rose-500" /> : index + 1}</td><td className="max-w-36 truncate py-3 text-sm font-medium text-slate-800">{player.name}</td><td className="py-3 text-center text-sm text-slate-500">{player.wins}-{player.losses}</td><td className="py-3 text-right text-sm font-semibold text-slate-900">{Math.round(rate * 100)}%</td></tr> })}</tbody></table></div> : <Empty message="Standings appear as players complete matches." />}
            </section>
          </div>
        </>}
      </div>
    </main>
  )
}

function Empty({ message }) {
  return <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center"><ListOrdered className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-600">{message}</p></div>
}
