import { CircleCheck, Clock3, Crown, Trophy, Users, X, RotateCcw } from 'lucide-react'

function getPlayerName(playerMap, id) {
  return playerMap.get(id) || 'Player'
}

export default function Review({ session, onClose, onReopen, reopening = false }) {
  if (!session) return null

  const playerMap = new Map(session.playerDetails.map((player) => [player.id, player.name]))
  const completedMatches = session.matchDetails.filter((match) => match.status === 'completed')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-5" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="session-review-title" className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="relative shrink-0 bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 px-5 py-5 text-white sm:px-6">
          <button type="button" onClick={onClose} aria-label="Close session review" className="absolute right-4 top-4 rounded-lg p-2 text-white/75 transition hover:bg-white/10 hover:text-white"><X size={19} /></button>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-200">Session review</p>
          <h2 id="session-review-title" className="mt-1 pr-10 text-xl font-bold sm:text-2xl">{session.name}</h2>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/80">
            <span className="inline-flex items-center gap-1.5"><Users size={14} />{session.playerDetails.length} players</span>
            <span className="inline-flex items-center gap-1.5"><CircleCheck size={14} />{session.courtCount} {session.courtCount === 1 ? 'court' : 'courts'}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{session.status}</span>
          </div>
        </header>

        <div className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-6">
          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-slate-900">Players and ratings</h3><span className="text-xs text-slate-500">Rating = win rate</span></div>
            {session.playerDetails.length ? <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:px-4"><span>Player</span><span className="text-center">W-L</span><span className="text-right">Rating</span></div>
              <ol className="divide-y divide-slate-100">{[...session.playerDetails].sort((a, b) => {
                const rateA = (a.wins || 0) + (a.losses || 0) ? (a.wins || 0) / ((a.wins || 0) + (a.losses || 0)) : 0
                const rateB = (b.wins || 0) + (b.losses || 0) ? (b.wins || 0) / ((b.wins || 0) + (b.losses || 0)) : 0
                return rateB - rateA || a.name.localeCompare(b.name)
              }).map((player) => {
                const wins = player.wins || 0
                const losses = player.losses || 0
                const games = wins + losses
                const rating = games ? Math.round((wins / games) * 100) : 0
                return <li key={player.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-3 text-sm sm:px-4"><span className="min-w-0 truncate font-medium text-slate-800">{player.name}<span className="ml-2 text-xs font-normal text-slate-400">{player.points || 0} pts</span></span><span className="min-w-10 text-center text-slate-600">{wins}-{losses}</span><span className="min-w-14 rounded-full bg-emerald-50 px-2 py-1 text-right text-xs font-semibold text-emerald-800">{rating}%</span></li>
              })}</ol>
            </div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No players were saved for this session.</p>}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-slate-900">Match winners</h3><span className="text-xs text-slate-500">{completedMatches.length} completed</span></div>
            {completedMatches.length ? <ol className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1">{completedMatches.map((match, index) => {
              const winner = match.team_one_score > match.team_two_score ? 1 : match.team_two_score > match.team_one_score ? 2 : 0
              const winnerIds = winner === 1 ? (match.team_one_player_ids || []) : winner === 2 ? (match.team_two_player_ids || []) : []
              const winningNames = winnerIds.map((id) => getPlayerName(playerMap, id)).join(' & ')
              const teamOne = (match.team_one_player_ids || []).map((id) => getPlayerName(playerMap, id)).join(' & ')
              const teamTwo = (match.team_two_player_ids || []).map((id) => getPlayerName(playerMap, id)).join(' & ')
              return <li key={match.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Game #{index + 1} · Court {match.court_number}</span><span className="text-xs font-semibold text-slate-600">{match.team_one_score ?? '-'} : {match.team_two_score ?? '-'}</span></div>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><p className={`rounded-lg px-3 py-2 text-sm ${winner === 1 ? 'bg-emerald-50 font-semibold text-emerald-900' : 'bg-slate-50 text-slate-600'}`}>{teamOne || 'Team A'}</p><span className="text-center text-[10px] font-bold text-slate-400">VS</span><p className={`rounded-lg px-3 py-2 text-sm sm:text-right ${winner === 2 ? 'bg-emerald-50 font-semibold text-emerald-900' : 'bg-slate-50 text-slate-600'}`}>{teamTwo || 'Team B'}</p></div>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-800">{winner ? <><Trophy size={13} /> Winner: {winningNames}</> : <><Crown size={13} /> Winner not recorded</>}</p>
              </li>
            })}</ol> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No completed match results for this session yet.</p>}
          </section>
        </div>
        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {session.status === 'Completed' && <button type="button" onClick={() => onReopen?.(session)} disabled={reopening} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"><RotateCcw size={15} />{reopening ? 'Reopening…' : 'Reopen session'}</button>}
          <button type="button" onClick={onClose} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 sm:ml-auto">Close review</button>
        </footer>
      </section>
    </div>
  )
}
