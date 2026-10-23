import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  History as HistoryIcon,
  Medal,
  Plus,
  QrCode,
  TrendingUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  getActiveSession,
  getSupabaseError,
  subscribeToSession,
  supabase,
  TABLES,
} from "../lib/supabase";
import liveQueueQrCode from "../assets/qr-code.png";

function StatusBadge({ status }) {
  const styles = {
    Available: "bg-emerald-50 text-emerald-700",
    "In progress": "bg-blue-50 text-blue-700",
    "Getting ready": "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function playerWinRate(player) {
  const wins = player.wins || 0;
  const games = wins + (player.losses || 0);
  return games ? wins / games : 0;
}

function mixTeams(players, matches) {
  const pairKey = (first, second) => [first.id, second.id].sort().join(":");
  const partnerCounts = new Map();
  for (const match of matches) {
    for (const teamIds of [
      match.team_one_player_ids || [],
      match.team_two_player_ids || [],
    ]) {
      if (teamIds.length !== 2) continue;
      const key = [...teamIds].sort().join(":");
      partnerCounts.set(key, (partnerCounts.get(key) || 0) + 1);
    }
  }

  const candidates = [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ];
  // Smooth small samples toward 50% so one early win/loss does not dominate
  // team balancing. Players with no results are treated as evenly matched.
  const winRate = (player) => {
    const wins = Number(player.wins) || 0;
    const losses = Number(player.losses) || 0;
    return (wins + 1) / (wins + losses + 2);
  };
  const scored = candidates.map((teams) => {
    const repeatedPartnerships = teams.reduce(
      (sum, [first, second]) =>
        sum +
        (partnerCounts.get(pairKey(players[first], players[second])) || 0),
      0,
    );
    const teamOneRate =
      (winRate(players[teams[0][0]]) + winRate(players[teams[0][1]])) / 2;
    const teamTwoRate =
      (winRate(players[teams[1][0]]) + winRate(players[teams[1][1]])) / 2;
    return {
      teams,
      repeatedPartnerships,
      teamStrengthGap: Math.abs(teamOneRate - teamTwoRate),
    };
  });
  scored.sort(
    (a, b) =>
      a.repeatedPartnerships - b.repeatedPartnerships ||
      a.teamStrengthGap - b.teamStrengthGap,
  );
  const best = scored.filter(
    (candidate) =>
      candidate.repeatedPartnerships === scored[0].repeatedPartnerships &&
      Math.abs(candidate.teamStrengthGap - scored[0].teamStrengthGap) < 1e-9,
  );
  const [teamOne, teamTwo] =
    best[Math.floor(Math.random() * best.length)].teams;
  return {
    teamOne: teamOne.map((index) => players[index]),
    teamTwo: teamTwo.map((index) => players[index]),
  };
}

function CourtCard({ court, onAssign, onStart, onFinish, busy, canAssign }) {
  const renderTeam = (team, number, position) => (
    <div
      className={`absolute ${position} flex flex-col items-center justify-center`}
    >
      <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/80">
        Team {number}
      </span>
      <div className="flex w-full flex-col items-center gap-1">
        {team.map((player) => (
          <span
            key={player}
            className="w-full truncate rounded-md border border-white/30 bg-emerald-950/45 px-1.5 py-0.5 text-center text-[9px] font-semibold text-white sm:text-[10px]"
          >
            {player}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
      <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 text-xs font-bold text-lime-300">
            {String(court.id).padStart(2, "0")}
          </span>
          <div>
            <h3 className="font-semibold leading-tight text-slate-900">
              Court {court.id}
            </h3>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              Doubles court
            </p>
          </div>
        </div>
        <StatusBadge status={court.status} />
      </div>

      <div className="relative isolate h-32 w-full overflow-hidden rounded-lg border-4 border-[#174b3a] bg-[#28745b] shadow-inner sm:h-36">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.035),transparent_48%,rgba(0,0,0,.06))]" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 border-l-[3px] border-white shadow-[2px_0_4px_rgba(0,0,0,.25)]" />
        <div className="pointer-events-none absolute inset-y-0 left-[31%] border-l-2 border-white/85" />
        <div className="pointer-events-none absolute inset-y-0 right-[31%] border-r-2 border-white/85" />
        {court.status === "Available" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center text-white">
            <div className="flex flex-col rounded-xl border border-white/20 bg-emerald-950/80 p-3 shadow-lg">
              <span className="rounded-full border border-white/40 bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold">
                Court open
              </span>
              <span className="mt-1 text-[9px] text-white/85">
                Ready for the next four
              </span>
            </div>
          </div>
        ) : (
          <>
            {renderTeam(court.team1, 1, "inset-y-1 left-[2%] w-[27%]")}
            {renderTeam(court.team2, 2, "inset-y-1 right-[2%] w-[27%]")}
          </>
        )}
      </div>

      {court.status === "Available" && (
        <button
          type="button"
          disabled={busy || !canAssign}
          onClick={() => onAssign(court)}
          className="mt-2 w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          {canAssign ? "Assign next four" : "Need 4 waiting players"}
        </button>
      )}
      {court.matchId &&
        (court.status === "In progress" ? (
          <div className="mt-2">
            <p className="mb-1.5 text-[11px] font-medium text-slate-500">
              Select the winning team
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[court.team1, court.team2].map((team, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={busy}
                  onClick={() => onFinish(court, index + 1)}
                  aria-label={`${team.join(" and ")} won`}
                  className="min-w-0 rounded-lg bg-emerald-700 px-2 py-2 text-center text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  <span className="block">Team {index + 1} wins</span>
                  <span className="mt-0.5 block truncate text-[9px] font-medium text-emerald-100">
                    {team.join(" & ")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStart(court)}
            className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Start match
          </button>
        ))}
    </article>
  );
}

export default function LiveMatchQueue() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [showLiveQueueCard, setShowLiveQueueCard] = useState(false);
  const navigate = useNavigate();
  const refresh = useCallback(async () => {
    try {
      setSession(await getActiveSession());
      setError("");
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    if (!session?.id) return undefined;
    const channel = subscribeToSession(session.id, refresh);
    return () => {
      channel.unsubscribe();
    };
  }, [session?.id, refresh]);

  const matches = session?.matches || [];
  const players = session?.players || [];
  const courts = Array.from(
    { length: session?.court_count || 0 },
    (_, index) => {
      const match = matches.find(
        (item) =>
          item.court_number === index + 1 &&
          ["getting_ready", "in_progress"].includes(item.status),
      );
      const names = (ids) =>
        ids.map(
          (id) => players.find((player) => player.id === id)?.name || "Player",
        );
      return {
        id: index + 1,
        matchId: match?.id,
        playerIds: match
          ? [...match.team_one_player_ids, ...match.team_two_player_ids]
          : [],
        team1Ids: match?.team_one_player_ids || [],
        team2Ids: match?.team_two_player_ids || [],
        status:
          match?.status === "in_progress"
            ? "In progress"
            : match
              ? "Getting ready"
              : "Available",
        team1: match ? names(match.team_one_player_ids) : [],
        team2: match ? names(match.team_two_player_ids) : [],
      };
    },
  );
  const completedMatches = [...matches]
    .filter((match) => match.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.completed_at || b.created_at) -
        new Date(a.completed_at || a.created_at),
    );

  const availableCourts = courts.filter(
    (court) => court.status === "Available",
  ).length;
  const activeMatchCount = courts.filter((court) => court.matchId).length;

  const waiting = [...players]
    .filter((player) => player.status === "waiting")
    .sort((a, b) => a.queue_position - b.queue_position);
  const rankedPlayers = [...players].sort(
    (a, b) =>
      (b.points || 0) - (a.points || 0) ||
      playerWinRate(b) - playerWinRate(a) ||
      (b.wins || 0) - (a.wins || 0) ||
      a.name.localeCompare(b.name),
  );

  async function addPlayer(event) {
    event.preventDefault();
    const name = playerName.trim();
    if (!session || !name || busy) return;
    if (
      players.some((player) => player.name.toLowerCase() === name.toLowerCase())
    ) {
      setError(`${name} is already in this session.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: insertError } = await supabase
        .from(TABLES.players)
        .insert({
          session_id: session.id,
          name,
          status: "waiting",
          queue_position:
            Math.max(-1, ...waiting.map((player) => player.queue_position)) + 1,
        });
      if (insertError) throw insertError;
      setPlayerName("");
      await refresh();
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function removePlayer(player) {
    if (busy || !window.confirm(`Remove ${player.name} from the waiting list?`))
      return;
    setBusy(true);
    setError("");
    try {
      const { error: queryError } = await supabase
        .from(TABLES.players)
        .update({ status: "checked_out" })
        .eq("id", player.id);
      if (queryError) throw queryError;
      await refresh();
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function movePlayer(player, offset) {
    const index = waiting.findIndex((entry) => entry.id === player.id);
    const neighbor = waiting[index + offset];
    if (!neighbor || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: firstError } = await supabase
        .from(TABLES.players)
        .update({ queue_position: neighbor.queue_position })
        .eq("id", player.id);
      if (firstError) throw firstError;
      const { error: secondError } = await supabase
        .from(TABLES.players)
        .update({ queue_position: player.queue_position })
        .eq("id", neighbor.id);
      if (secondError) throw secondError;
      await refresh();
    } catch (err) {
      setError(getSupabaseError(err));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function assignNextFour(court) {
    if (!session || waiting.length < 4 || busy || court.status !== "Available")
      return;
    const courtNumber = court.id;
    if (
      matches.some(
        (match) =>
          match.court_number === courtNumber &&
          ["getting_ready", "in_progress"].includes(match.status),
      )
    ) {
      setError("That court is no longer available.");
      return;
    }
    if (!courtNumber) {
      setError(
        "All courts are occupied. Finish a match before assigning another.",
      );
      return;
    }
    const selected = waiting.slice(0, 4);
    const teams = mixTeams(selected, matches);
    setBusy(true);
    setError("");
    try {
      const { error: matchError } = await supabase.rpc("paddleq_assign_match", {
        p_session_id: session.id,
        p_court_number: courtNumber,
        p_team_one_player_ids: teams.teamOne.map((player) => player.id),
        p_team_two_player_ids: teams.teamTwo.map((player) => player.id),
      });
      if (matchError) throw matchError;
      await refresh();
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function updateMatch(court, status, winningTeam = null) {
    if (busy || !court.matchId) return;
    setBusy(true);
    setError("");
    try {
      if (status === "completed") {
        if (!winningTeam)
          throw new Error("Select the winning team to finish this match.");
        const { error: finishError } = await supabase.rpc(
          "paddleq_finish_match",
          {
            p_match_id: court.matchId,
            p_winning_team: winningTeam,
          },
        );
        if (finishError) throw finishError;
        await refresh();
        return;
      }
      const now = new Date().toISOString();
      const { error: matchError } = await supabase
        .from(TABLES.matches)
        .update({
          status,
          ...(status === "in_progress"
            ? { started_at: now }
            : { completed_at: now }),
          ...(status === "completed" && winningTeam
            ? {
                team_one_score: winningTeam === 1 ? 1 : 0,
                team_two_score: winningTeam === 2 ? 1 : 0,
              }
            : {}),
        })
        .eq("id", court.matchId);
      if (matchError) throw matchError;

      await refresh();
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteMatch(match) {
    const teamOne = match.team_one_player_ids
      .map((id) => players.find((player) => player.id === id)?.name || "Player")
      .join(" & ");
    const teamTwo = match.team_two_player_ids
      .map((id) => players.find((player) => player.id === id)?.name || "Player")
      .join(" & ");
    if (
      !window.confirm(
        `Delete this match from Court ${match.court_number}?\n\n${teamOne} vs ${teamTwo}\n\nThis cannot be undone.`,
      )
    )
      return;

    setBusy(true);
    setError("");
    try {
      const { error: deleteError } = await supabase.rpc(
        "paddleq_delete_match",
        {
          p_match_id: match.id,
        },
      );
      if (deleteError) throw deleteError;
      await refresh();
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function completeSession() {
    if (!session || activeMatchCount > 0 || busy) return;
    if (
      !window.confirm(
        `Finish â€œ${session.name}â€ and move it to Session History?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const { data: completedSession, error: updateError } = await supabase
        .from(TABLES.sessions)
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", session.id)
        .eq("status", "active")
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!completedSession)
        throw new Error(
          "Session was not archived. Refresh the page and retry.",
        );
      navigate("/podium");
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function addCourt() {
    if (!session || busy || session.court_count >= 8) return;
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from(TABLES.sessions)
        .update({ court_count: session.court_count + 1 })
        .eq("id", session.id)
        .eq("status", "active");
      if (updateError) throw updateError;
      await refresh();
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeCourt() {
    if (!session || busy || session.court_count <= 1) return;
    const lastCourtNumber = session.court_count;
    const occupied = matches.some(
      (match) =>
        match.court_number === lastCourtNumber &&
        ["getting_ready", "in_progress"].includes(match.status),
    );
    if (occupied) {
      setError(
        `Court ${lastCourtNumber} has an active match. Finish it before removing the court.`,
      );
      return;
    }
    if (!window.confirm(`Remove Court ${lastCourtNumber} from this session?`))
      return;

    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from(TABLES.sessions)
        .update({ court_count: lastCourtNumber - 1 })
        .eq("id", session.id)
        .eq("status", "active");
      if (updateError) throw updateError;
      await refresh();
    } catch (err) {
      setError(getSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Page Header */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">
                <Activity size={15} /> Live session controls
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Manage Match Queue
              </h1>
              <p className="mt-2 text-sm text-white/85">
                {session
                  ? session.name
                  : "Manage courts, players, and match results."}
              </p>
            </div>
            {session && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
                  <Users size={14} />
                  {players.length} players
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
                  {activeMatchCount} active matches
                </span>
                <button
                  type="button"
                  onClick={() => setShowLiveQueueCard((shown) => !shown)}
                  aria-expanded={showLiveQueueCard}
                  className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-lime-200"
                >
                  <QrCode size={16} />
                  Show Live Queue
                </button>
              </div>
            )}
          </div>
        </section>
        {showLiveQueueCard && (
          <div
            className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950/60 px-4 py-6"
            onClick={() => setShowLiveQueueCard(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="live-queue-modal-title"
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-black/30"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="h-2 bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-700" />
              <button
                type="button"
                onClick={() => setShowLiveQueueCard(false)}
                aria-label="Close live queue dialog"
                className="absolute right-4 top-5 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
              >
                <X size={18} />
              </button>
              <div className="bg-[#123f33] px-6 pb-6 pt-5 text-center text-white">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-lime-200">
                  <QrCode size={22} />
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200">
                  Share with players
                </p>
                <h2
                  id="live-queue-modal-title"
                  className="mt-1 text-xl font-bold"
                >
                  Live Queue
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  Let players follow the court rotation.
                </p>
              </div>
              <div className="px-6 py-6 text-center">
                <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img
                    src={liveQueueQrCode}
                    alt="QR code to open the live queue"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Scan to open the live queue.
                </p>
                <a
                  href="https://paddleq.vercel.app/live-queue"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-1"
                >
                  View live queue
                </a>

                <button
                  type="button"
                  onClick={() => setShowLiveQueueCard(false)}
                  className="mt-5 w-full rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
                >
                  Done
                </button>
              </div>
            </section>
          </div>
        )}
        

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {loading && <p className="text-sm text-slate-500">Loading courtsâ€¦</p>}
        {!loading && !session && (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-slate-900">No active session</p>
            <p className="mt-1 text-sm text-slate-500">
              Create a session before managing matches.
            </p>
            <Link
              to="/set-session"
              className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Set up session
            </Link>
          </section>
        )}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Play area
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Courts
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {availableCourts} of {courts.length} available
              </span>
              {session && (
                <>
                  <button
                    type="button"
                    onClick={removeCourt}
                    disabled={
                      busy ||
                      session.court_count <= 1 ||
                      matches.some(
                        (match) =>
                          match.court_number === session.court_count &&
                          ["getting_ready", "in_progress"].includes(
                            match.status,
                          ),
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                    Remove court
                  </button>
                  <button
                    type="button"
                    onClick={addCourt}
                    disabled={busy || session.court_count >= 8}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} />
                    {session.court_count >= 8
                      ? "Court limit reached"
                      : "Add court"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {courts.map((court) => (
              <CourtCard
                key={court.id}
                court={court}
                busy={busy}
                canAssign={waiting.length >= 4}
                onAssign={assignNextFour}
                onStart={(item) => updateMatch(item, "in_progress")}
                onFinish={(item, winner) =>
                  updateMatch(item, "completed", winner)
                }
              />
            ))}
          </div>
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Next four players
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {Math.min(waiting.length, 4)}/4 players
            </span>
          </div>
          {waiting.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[0, 1].map((teamIndex) => {
                const teamPlayers = waiting.slice(
                  teamIndex * 2,
                  teamIndex * 2 + 2,
                );
                return (
                  <div
                    key={teamIndex}
                    className="min-w-0 rounded-xl bg-slate-50 p-2.5 sm:p-3"
                  >
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Team {teamIndex + 1}
                    </p>
                    <div className="space-y-1.5">
                      {[0, 1].map((slot) => {
                        const player = teamPlayers[slot];
                        return (
                          <div
                            key={player?.id || `waiting-${teamIndex}-${slot}`}
                            className={`flex min-h-9 min-w-0 items-center gap-2 rounded-lg px-2 ${player ? "bg-white text-slate-800 shadow-sm" : "border border-dashed border-slate-200 text-slate-400"}`}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-800">
                              {teamIndex * 2 + slot + 1}
                            </span>
                            <span className="truncate text-xs font-medium">
                              {player?.name || "Waiting"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Waiting for players to join the queue.
            </p>
          )}
          {waiting.length > 0 && waiting.length < 4 && (
            <p className="mt-3 text-xs text-slate-500">
              Waiting for {4 - waiting.length} more player
              {waiting.length === 3 ? "" : "s"} before a match can be assigned.
            </p>
          )}
        </section>

        {session && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="font-semibold text-slate-900">Add a player</h2>
                <p className="mt-1 text-sm text-slate-500">
                  New players join the end of the waiting list.
                </p>
              </div>
              <form
                onSubmit={addPlayer}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  maxLength={80}
                  placeholder="Player name"
                  aria-label="Player name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="submit"
                  disabled={busy || !playerName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  <Plus size={17} />
                  Add player
                </button>
              </form>
            </section>

            <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <section className="h-full rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Waiting queue controls
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Change the play order or remove a player.
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {waiting.length} waiting
                </span>
              </div>
              {waiting.length ? (
                <ol className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto xl:max-h-none xl:overflow-visible">
                  {waiting.map((player, index) => (
                    <li
                      key={player.id}
                      className={`flex items-center gap-2 px-2 py-2.5 ${
                        index < 4
                          ? "rounded-lg bg-emerald-50/80"
                          : ""
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${index < 4 ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                        {player.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => movePlayer(player, -1)}
                        disabled={busy || index === 0}
                        aria-label={`Move ${player.name} up`}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePlayer(player, 1)}
                        disabled={busy || index === waiting.length - 1}
                        aria-label={`Move ${player.name} down`}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePlayer(player)}
                        disabled={busy}
                        aria-label={`Remove ${player.name}`}
                        className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 size={17} />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">
                  No players are waiting.
                </p>
              )}
            </section>
            <section className="h-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Session stats</p>
                  <h2 className="mt-1 font-semibold text-slate-900">Win rate</h2>
                </div>
                <TrendingUp className="text-emerald-600" size={19} />
              </div>
              {rankedPlayers.length ? (
                <div className="max-h-[26rem] overflow-y-auto xl:max-h-none xl:overflow-visible">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-slate-100 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <span>Player</span><span className="text-center">W-L</span><span className="text-right">Rate</span>
                  </div>
                  <ol className="divide-y divide-slate-100">
                    {rankedPlayers.map((player, index) => (
                      <li key={player.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            role="img"
                            aria-label={index < 3 ? `${["Gold", "Silver", "Bronze"][index]} place` : `Rank ${index + 1}`}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index === 0 ? "bg-amber-100 text-amber-600" : index === 1 ? "bg-slate-100 text-slate-500" : index === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            {index < 3 ? <Medal size={16} aria-hidden="true" /> : index + 1}
                          </span>
                          <span className="truncate text-sm font-medium text-slate-800">{player.name}</span>
                        </span>
                        <span className="text-center text-xs text-slate-500">{player.wins || 0}-{player.losses || 0}</span>
                        <span className="min-w-12 rounded-full bg-emerald-50 px-2 py-1 text-right text-xs font-semibold text-emerald-800">{Math.round(playerWinRate(player) * 100)}%</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">Standings appear after matches are played.</p>
              )}
            </section>
            </div>
          </>
        )}

        {/* Match History */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Match history</h2>
              <p className="mt-1 text-sm text-slate-500">Completed matches from this session.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{completedMatches.length} played</span>
          </div>
          {completedMatches.length ? (
            <ol className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto overscroll-contain">
              {completedMatches.map((match) => {
                const teamOne = match.team_one_player_ids.map(
                  (id) =>
                    players.find((player) => player.id === id)?.name ||
                    "Player",
                );
                const teamTwo = match.team_two_player_ids.map(
                  (id) =>
                    players.find((player) => player.id === id)?.name ||
                    "Player",
                );
                const winner =
                  match.team_one_score > match.team_two_score
                    ? 1
                    : match.team_two_score > match.team_one_score
                      ? 2
                      : 0;
                const date = match.completed_at || match.created_at;
                const score = `${match.team_one_score ?? "-"} : ${match.team_two_score ?? "-"}`;
                return (
                  <li key={match.id} className="flex items-center gap-2.5 py-3 sm:gap-4">
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">C{match.court_number}</span>
                    <div className="min-w-0 flex-1">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                        <span className={`truncate ${winner === 1 ? "font-semibold text-emerald-800" : "text-slate-700"}`} title={teamOne.join(" & ")}>{teamOne.join(" & ")}</span>
                        <span className="text-[10px] text-slate-400">vs</span>
                        <span className={`truncate text-right ${winner === 2 ? "font-semibold text-emerald-800" : "text-slate-700"}`} title={teamTwo.join(" & ")}>{teamTwo.join(" & ")}</span>
                      </div>
                      <time className="mt-1 block text-[10px] text-slate-400">{date ? new Date(date).toLocaleString() : "Time unavailable"}</time>
                    </div>
                    <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">{score}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteMatch(match)}
                      aria-label={`Delete match from Court ${match.court_number}`}
                      className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
              <HistoryIcon className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                No completed matches yet.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Match results will appear here after a winner is selected.
              </p>
            </div>
          )}
          
        </section>
        {session && (
          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Finish this session
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Archive it in Session History when all courts are clear.
              </p>
            </div>
            <button
              type="button"
              onClick={completeSession}
              disabled={busy || activeMatchCount > 0}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Finish session
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
