import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Medal, Plus, Trophy, TrendingUp, Users } from 'lucide-react'
import { getSupabaseError, supabase, TABLES } from '../lib/supabase'

const podiumStyles = {
  1: { shell: 'border-amber-200 bg-amber-50', badge: 'bg-amber-200 text-amber-900', icon: 'text-amber-600' },
  2: { shell: 'border-slate-200 bg-slate-50', badge: 'bg-slate-200 text-slate-700', icon: 'text-slate-500' },
  3: { shell: 'border-orange-200 bg-orange-50', badge: 'bg-orange-100 text-orange-800', icon: 'text-orange-600' },
}

function winRate(player) {
  const wins = player.wins || 0
  const losses = player.losses || 0
  const games = wins + losses
  return games ? Math.round((wins / games) * 100) : 0
}

export default function Podium() {
  const [players, setPlayers] = useState([])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const { data: activeSessions, error: activeError } = await supabase
        .from(TABLES.sessions).select('id,name,status,session_date,created_at')
        .eq('status', 'active').order('created_at', { ascending: false }).limit(1)
      if (activeError) throw activeError

      let selectedSession = activeSessions?.[0]
      if (!selectedSession) {
        const { data: completedSessions, error: completedError } = await supabase
          .from(TABLES.sessions).select('id,name,status,session_date,created_at')
          .eq('status', 'completed').order('completed_at', { ascending: false }).limit(1)
        if (completedError) throw completedError
        selectedSession = completedSessions?.[0]
      }

      if (!selectedSession) {
        setSession(null)
        setPlayers([])
        setError('')
        return
      }

      const { data, error: playersError } = await supabase.from(TABLES.players)
        .select('id,name,wins,losses,points')
        .eq('session_id', selectedSession.id)
      if (playersError) throw playersError
      setSession(selectedSession)
      setPlayers(data || [])
      setError('')
    } catch (err) {
      setError(getSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  async function finishPodium() {
    if (!session || session.status !== 'active' || finishing) return
    const confirmed = window.confirm(`Finish the podium for "${session.name}" and save it to Session History?`)
    if (!confirmed) return
    setFinishing(true)
    setError('')
    try {
      const { data, error: updateError } = await supabase.from(TABLES.sessions)
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', session.id).eq('status', 'active').select('id')
      if (updateError) throw updateError
      if (!data?.length) throw new Error('Podium was not finished. Refresh and try again.')
      await refresh()
    } catch (err) {
      setError(getSupabaseError(err))
    } finally {
      setFinishing(false)
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => { if (active) await refresh() }
    const timer = setTimeout(load, 0)
    const channel = supabase.channel('paddleq-podium')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.sessions }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.players }, load)
      .subscribe()
    return () => { active = false; clearTimeout(timer); channel.unsubscribe() }
  }, [refresh])

  const rankedPlayers = [...players].sort((a, b) =>
    (b.points || 0) - (a.points || 0) ||
    winRate(b) - winRate(a) ||
    (b.wins || 0) - (a.wins || 0) ||
    a.name.localeCompare(b.name)
  )
  const topThree = rankedPlayers.slice(0, 3)
  const totalWins = rankedPlayers.reduce((sum, player) => sum + (player.wins || 0), 0)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 px-5 py-7 text-white shadow-sm sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime-200"><Trophy size={15} /> Player rankings</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Podium</h1>
              <p className="mt-2 text-sm text-white/85 sm:text-base">{session ? `${session.name} · ${session.status === 'active' ? 'Live standings' : 'Final standings'}` : 'Standings for your latest session.'}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                {session && <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">{session.status === 'active' ? 'Session live' : 'Session complete'}</span>}
                {session?.status === 'active' && <button type="button" onClick={finishPodium} disabled={finishing} className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60">{finishing ? 'Finishing...' : 'Finish podium'}</button>}
                {session?.status !== 'active' && <Link to="/set-session" className="inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-lime-200"><Plus size={15} />New session</Link>}
              </div>
              <p className="text-xs text-white/70">Standings update automatically when a new session is created.</p>
            </div>
          </div>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p className="text-sm text-slate-500">Loading standings...</p>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Summary icon={<Users size={20} />} label="Ranked players" value={rankedPlayers.length} />
          <Summary icon={<Trophy size={20} />} label="Top player" value={rankedPlayers[0]?.name || '—'} />
          <Summary icon={<TrendingUp size={20} />} label="Total wins" value={totalWins} />
        </section>

        {!loading && !error && !rankedPlayers.length ? (
          <section className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
            <Trophy className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">No standings to show yet</p>
            <p className="mt-1 text-sm text-slate-500">Create a session, add players, and record match results to build the podium.</p>
          </section>
        ) : !loading && rankedPlayers.length > 0 && <>
          <section>
            <div className="mb-3"><h2 className="text-base font-semibold text-slate-900">Top players</h2><p className="mt-1 text-sm text-slate-500">Ranked by points, win rate, then wins.</p></div>
            <div className="grid gap-3 sm:grid-cols-3">
              {topThree.map((player, index) => {
                const rank = index + 1
                const style = podiumStyles[rank]
                const Icon = rank === 1 ? Trophy : Medal
                return <article key={player.id} className={`rounded-xl border p-5 shadow-sm ${style.shell} ${rank === 1 ? 'sm:-translate-y-1' : ''}`}>
                  <div className="flex items-center justify-between gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>{rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place'}</span><Icon size={21} className={style.icon} /></div>
                  <div className="mt-5"><p className="truncate text-lg font-semibold text-slate-900">{player.name}</p><p className="mt-1 text-sm text-slate-600">{player.wins || 0} wins · {player.losses || 0} losses</p></div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-4">
                    <div><p className="text-xs text-slate-500">Points</p><p className="mt-1 text-xl font-bold text-slate-900">{player.points || 0}</p></div>
                    <div><p className="text-xs text-slate-500">Win rate</p><p className="mt-1 text-xl font-bold text-emerald-800">{winRate(player)}%</p></div>
                  </div>
                </article>
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-base font-semibold text-slate-900">Leaderboard</h2><p className="mt-1 text-sm text-slate-500">Player rankings and win rates for this session.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left">
              <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="px-4 py-3 font-medium">Rank</th><th className="px-4 py-3 font-medium">Player</th><th className="px-4 py-3 text-center font-medium">Wins</th><th className="px-4 py-3 text-center font-medium">Losses</th><th className="px-4 py-3 text-center font-medium">Win rate</th><th className="px-4 py-3 text-right font-medium">Points</th></tr></thead>
              <tbody>{rankedPlayers.map((player, index) => <tr key={player.id} className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40"><td className="px-4 py-3.5 text-sm font-semibold text-slate-500">{index + 1}</td><td className="px-4 py-3.5 font-medium text-slate-900">{player.name}</td><td className="px-4 py-3.5 text-center text-sm text-slate-600">{player.wins || 0}</td><td className="px-4 py-3.5 text-center text-sm text-slate-600">{player.losses || 0}</td><td className="px-4 py-3.5 text-center"><span className="inline-flex min-w-14 justify-center rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-800">{winRate(player)}%</span></td><td className="px-4 py-3.5 text-right font-semibold text-slate-900">{player.points || 0}</td></tr>)}</tbody>
            </table></div>
          </section>
        </>}
      </div>
    </main>
  )
}

function Summary({ icon, label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{icon}</div><div className="min-w-0"><p className="text-sm text-slate-500">{label}</p><p className="truncate text-xl font-semibold text-slate-900">{value}</p></div></div></div>
}
