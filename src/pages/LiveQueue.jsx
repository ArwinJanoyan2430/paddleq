import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUp, ListOrdered, Medal, Radio, TrendingUp } from 'lucide-react'
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
    return (b.points || 0) - (a.points || 0) ||
      rateB - rateA ||
      (b.wins || 0) - (a.wins || 0) ||
      a.name.localeCompare(b.name)
  })

  return (
    <main className="min-h-screen w-full bg-slate-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
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
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] 2xl:gap-6"><section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">On court</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Live matches</h2></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{activeMatches.length} active</span></div>
              {visibleMatches.length ? <div className="mt-5 space-y-3">
                {visibleMatches.map((match) => {
                  const statusLabel = match.status === 'in_progress' ? 'Playing' : match.status === 'queued' ? 'Queued' : 'Getting ready'
                  const statusStyle = match.status === 'in_progress'
                    ? { backgroundColor: '#d9f99d', color: '#123f33' }
                    : match.status === 'queued'
                      ? { backgroundColor: 'rgba(255,255,255,.2)', color: '#ffffff' }
                      : { backgroundColor: '#fde68a', color: '#123f33' }
                  const teamOne = (match.team_one_player_ids || []).map((id) => playerMap.get(id) || 'Player')
                  const teamTwo = (match.team_two_player_ids || []).map((id) => playerMap.get(id) || 'Player')

                  return (
                    <article key={match.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 text-xs font-bold text-lime-300">{String(match.court_number).padStart(2, '0')}</span>
                          <div><h3 className="text-sm font-semibold text-slate-900">Court {match.court_number}</h3><p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">Doubles court</p></div>
                        </div>
                        <span className="inline-flex min-h-7 items-center rounded-full px-3 text-[10px] font-bold leading-none" style={statusStyle}>{statusLabel}</span>
                      </div>

                      <div className="relative isolate h-28 overflow-hidden rounded-lg border-4 border-[#174b3a] bg-[#28745b] sm:h-32">
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.035),transparent_48%,rgba(0,0,0,.06))]" />
                        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 border-l-[3px] border-white shadow-[2px_0_4px_rgba(0,0,0,.25)]" />
                        <div className="pointer-events-none absolute inset-y-0 left-[31%] border-l-2 border-white/85" />
                        <div className="pointer-events-none absolute inset-y-0 right-[31%] border-r-2 border-white/85" />
                        <div className="absolute inset-y-1 left-[2%] flex w-[27%] flex-col items-center justify-center">
                          <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/80">Team 1</span>
                          <div className="flex w-full flex-col items-center gap-1">{teamOne.map((player) => <span key={player} className="w-full truncate rounded-md border border-white/30 bg-emerald-950/45 px-1.5 py-0.5 text-center text-[9px] font-semibold text-white">{player}</span>)}</div>
                        </div>
                        <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-emerald-950 shadow">Net</span>
                        <div className="absolute inset-y-1 right-[2%] flex w-[27%] flex-col items-center justify-center">
                          <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/80">Team 2</span>
                          <div className="flex w-full flex-col items-center gap-1">{teamTwo.map((player) => <span key={player} className="w-full truncate rounded-md border border-white/30 bg-emerald-950/45 px-1.5 py-0.5 text-center text-[9px] font-semibold text-white">{player}</span>)}</div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div> : <Empty message="No matches assigned yet. The next four waiting players will appear on the court." />}
            </section>

            
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Next on court</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Up next</h2>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{upNextIds.length}/4 players</span>
              </div>
              {upNextIds.length ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[0, 1].map((teamIndex) => {
                    const teamPlayers = upNextIds.slice(teamIndex * 2, teamIndex * 2 + 2)
                    return (
                      <div key={teamIndex} className="min-w-0 rounded-xl bg-slate-50 p-2.5 sm:p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Team {teamIndex + 1}</p>
                        <div className="space-y-1.5">
                          {[0, 1].map((slot) => {
                            const id = teamPlayers[slot]
                            return (
                              <div key={id || `waiting-${teamIndex}-${slot}`} className={`flex min-h-9 min-w-0 items-center gap-2 rounded-lg px-2 ${id ? 'bg-white text-slate-800 shadow-sm' : 'border border-dashed border-slate-200 text-slate-400'}`}>
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-800">{teamIndex * 2 + slot + 1}</span>
                                <span className="truncate text-xs font-medium">{id ? playerMap.get(id) || 'Player' : 'Waiting'}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <Empty message="Waiting for players to join the queue." />}
              {upNextIds.length > 0 && upNextIds.length < 4 && <p className="mt-3 text-xs text-slate-500">Waiting for {4 - upNextIds.length} more player{upNextIds.length === 3 ? '' : 's'}.</p>}
            </section>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] 2xl:gap-6">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Queue order</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Waiting players</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{waiting.length} waiting</span></div>
              {waiting.length ? <ol className="divide-y divide-slate-100">{waiting.map((player, index) => <li key={player.id} className="flex items-center gap-3 py-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index < 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{player.name}</span>{index < 4 && <span title="Up next" aria-label="Up next" className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><ArrowUp size={15} strokeWidth={2.5} /></span>}</li>)}</ol> : <Empty message="The waiting list is clear." />}
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Session stats</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Win rate</h2></div><TrendingUp className="text-emerald-600" size={20} /></div>
              {rankedPlayers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[350px] text-left"><thead><tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="py-3">Player</th><th className="py-3 text-center">W-L</th><th className="py-3 text-right">Rate</th></tr></thead><tbody>{rankedPlayers.map((player, index) => { const games = player.wins + player.losses; const rate = games ? player.wins / games : 0; const medalStyle = index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-500' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'; return <tr key={player.id} className="border-b border-slate-100 last:border-0"><td className="max-w-36 truncate py-3 text-sm font-medium text-slate-800"><span className="mr-2 inline-flex align-middle"><span role="img" aria-label={index < 3 ? `${['Gold', 'Silver', 'Bronze'][index]} place` : `Rank ${index + 1}`} className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${medalStyle}`}>{index < 3 ? <Medal size={15} aria-hidden="true" /> : index + 1}</span></span>{player.name}</td><td className="py-3 text-center text-sm text-slate-500">{player.wins}-{player.losses}</td><td className="py-3 text-right text-sm font-semibold text-slate-900">{Math.round(rate * 100)}%</td></tr> })}</tbody></table></div> : <Empty message="Standings appear as players complete matches." />}
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
