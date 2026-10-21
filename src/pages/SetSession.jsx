import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  MapPin,
  Plus,
  Trash2,
  Users,
  Trophy,
  ClipboardList,
} from "lucide-react";
import Header from "../components/Header";
import { getActiveSession, getSupabaseError, supabase, TABLES } from "../lib/supabase";

export default function SetSession() {
  const [showAddMultiplePlayer, setShowAddMultiplePlayer] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [clubName, setClubName] = useState("");
  const [courtCount, setCourtCount] = useState(4);
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeSession, setActiveSession] = useState(null);
  const [checkingActiveSession, setCheckingActiveSession] = useState(true);
  const [confirmingPlayers, setConfirmingPlayers] = useState(false);
  const navigate = useNavigate();

  const refreshActiveSession = useCallback(async () => {
    try {
      setActiveSession(await getActiveSession());
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getSupabaseError(error));
    } finally {
      setCheckingActiveSession(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refreshActiveSession, 0);
    const channel = supabase
      .channel("active-session-setup-guard")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLES.sessions }, refreshActiveSession)
      .subscribe();
    return () => {
      clearTimeout(timer);
      channel.unsubscribe();
    };
  }, [refreshActiveSession]);

  const addPlayer = (e) => {
    e?.preventDefault();

    const name = playerName.trim();

    if (!name) return;

    if (players.some((player) => player.toLowerCase() === name.toLowerCase())) {
      alert("This player has already been added.");
      return;
    }

    setPlayers((current) => [...current, name]);
    setPlayerName("");
    setImportMessage("");
  };

  const addBulkPlayers = () => {
    const names = bulkNames
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\d+\s*[.)-]\s*/, "").trim())
      .filter(Boolean);

    if (names.length === 0) {
      setImportMessage("Please enter at least one player name.");
      return;
    }

    let addedCount = 0;
    let duplicateCount = 0;

    setPlayers((currentPlayers) => {
      const updatedPlayers = [...currentPlayers];

      names.forEach((name) => {
        const alreadyExists = updatedPlayers.some(
          (player) => player.toLowerCase() === name.toLowerCase(),
        );

        if (alreadyExists) {
          duplicateCount++;
        } else {
          updatedPlayers.push(name);
          addedCount++;
        }
      });

      return updatedPlayers;
    });

    setBulkNames("");
    setImportMessage(
      `${addedCount} player${addedCount === 1 ? "" : "s"} added${
        duplicateCount
          ? `, ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} skipped`
          : ""
      }.`,
    );
  };

  const removePlayer = (index) => {
    setPlayers((current) => current.filter((_, i) => i !== index));
  };

  const createSession = async () => {
    if (saving || checkingActiveSession || activeSession) return;
    setSaving(true);
    setErrorMessage("");

    const session = {
      name: sessionName.trim() || `Session ${new Date().toLocaleDateString()}`,
      club_name: clubName.trim(),
      court_count: Number(courtCount),
    };

    try {
      const existingSession = await getActiveSession();
      if (existingSession) {
        setActiveSession(existingSession);
        return;
      }
      const { data: createdSession, error: sessionError } = await supabase
        .from(TABLES.sessions)
        .insert(session)
        .select('id')
        .single();
      if (sessionError) throw sessionError;
      setActiveSession({ ...session, id: createdSession.id });

      if (players.length) {
        const { error: playersError } = await supabase.from(TABLES.players).insert(
          players.map((name, index) => ({
            session_id: createdSession.id,
            name,
            queue_position: index,
          })),
        );
        if (playersError) {
          await supabase.from(TABLES.sessions).delete().eq('id', createdSession.id);
          throw playersError;
        }
      }
      navigate('/live-match-queue');
    } catch (error) {
      setErrorMessage(getSupabaseError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving || checkingActiveSession || activeSession) return;
    if (!players.length) {
      setErrorMessage("Add at least one player before saving the session.");
      return;
    }
    setErrorMessage("");
    setConfirmingPlayers(true);
  };

  const inputStyle =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  const labelStyle = "mb-1.5 block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Page Heading */}
        <div className="relative mb-7 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-lime-200"><Activity size={22} /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">Session management</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Set up your session</h1><p className="mt-1 text-sm text-white/80 sm:text-base">Configure your courts and add players before starting.</p></div>
          </div>
        </div>

        {activeSession && (
          <div role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            A session is currently active{activeSession.name ? `: ${activeSession.name}` : ""}. Finish it before setting up another session.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Session Details */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Session details
                    </h2>
                    <p className="text-sm text-slate-500">
                      Basic information about your game.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="clubName" className={labelStyle}>
                      Club name
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="clubName"
                        className={`${inputStyle} pl-9`}
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        placeholder="Your pickleball club"
                        maxLength={80}
                      />
                    </div>
                  </div>

                  <div>
                      <label htmlFor="courtCount" className={labelStyle}>
                        Number of courts
                      </label>
                      <select
                        id="courtCount"
                        className={inputStyle}
                        value={courtCount}
                        onChange={(e) => setCourtCount(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                          <option key={count} value={count}>
                            {count} {count === 1 ? "court" : "courts"}
                          </option>
                        ))}
                      </select>
                  </div>
                </div>
              </section>

              {/* Players */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Users className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-semibold text-slate-900">Players</h2>
                      <p className="text-sm text-slate-500">
                        Add players individually or import a list.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                    {players.length}
                  </span>
                </div>

                {/* Add One Player */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className={inputStyle}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter player name"
                    aria-label="Player name"
                    maxLength={80}
                  />

                  <button
                    type="button"
                    onClick={addPlayer}
                    disabled={!playerName.trim()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add player
                  </button>
                </div>

                {/* Bulk Import */}
                <a
                    onClick={()=>setShowAddMultiplePlayer(!showAddMultiplePlayer)}
                    className="cursor-pointer mt-3 w-full inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add multiple players
                  </a>
                {showAddMultiplePlayer && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-emerald-700" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Add multiple players
                      </h3>
                    </div>

                    <p className="mb-3 text-xs leading-5 text-slate-500">
                      Paste one name per line. Numbering is optional.
                    </p>

                    <textarea
                      value={bulkNames}
                      onChange={(e) => {
                        setBulkNames(e.target.value);
                        setImportMessage("");
                      }}
                      placeholder={"1. Arwin\n2. James\n3. Jerome"}
                      rows={5}
                      className={`${inputStyle} resize-y`}
                      aria-label="List of player names"
                    />

                    <button
                      type="button"
                      onClick={addBulkPlayers}
                      disabled={!bulkNames.trim()}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Users className="h-4 w-4" />
                      Import player names
                    </button>

                    {importMessage && (
                      <p
                        className="mt-3 text-sm text-emerald-700"
                        role="status"
                      >
                        {importMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* Player List */}
                <div className="mt-4">
                  {players.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
                      <Users className="mx-auto h-7 w-7 text-slate-300" />
                      <p className="mt-2 text-sm font-medium text-slate-600">
                        No players added yet
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Add player names to prepare your queue.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {players.map((player, index) => (
                        <li
                          key={`${player}-${index}`}
                          className="flex items-center gap-3 px-3 py-2.5"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">
                            {index + 1}
                          </span>

                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                            {player}
                          </span>

                          <button
                            type="button"
                            onClick={() => removePlayer(index)}
                            aria-label={`Remove ${player}`}
                            className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <aside className="space-y-5">
              {/* Session Summary */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Trophy className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Session summary
                    </h2>
                    <p className="text-sm text-slate-500">Review your setup.</p>
                  </div>
                </div>

                <div className="mt-5 divide-y divide-slate-100">
                  <div className="flex items-center justify-between gap-3 py-3">
                    <span className="text-sm text-slate-500">Courts</span>
                    <span className="text-sm font-medium text-slate-900">
                      {courtCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3">
                    <span className="text-sm text-slate-500">Players</span>
                    <span className="text-sm font-medium text-slate-900">
                      {players.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3">
                    <span className="text-sm text-slate-500">
                      Possible doubles
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {Math.floor(players.length / 4)}
                    </span>
                  </div>
                </div>

                {confirmingPlayers ? (
                  <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <h3 className="font-semibold text-emerald-900">Confirm players</h3>
                    <p className="mt-1 text-sm text-emerald-800">Review the {players.length} player{players.length === 1 ? "" : "s"} below. Saving will create the session and add them to the queue in this order.</p>
                    <ol className="mt-3 max-h-52 space-y-1 overflow-y-auto rounded-md bg-white p-3 text-sm text-slate-700">
                      {players.map((player, index) => <li key={`${player}-${index}`}>{index + 1}. {player}</li>)}
                    </ol>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => setConfirmingPlayers(false)} disabled={saving} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Back to edit</button>
                      <button type="button" onClick={createSession} disabled={saving || checkingActiveSession || Boolean(activeSession)} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving..." : "Confirm and save"}</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={saving || checkingActiveSession || Boolean(activeSession)}
                    className="mt-5 flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    {checkingActiveSession ? "Checking active session..." : activeSession ? "Session currently active" : "Review players and continue"}
                  </button>
                )}
                {errorMessage && <p role="alert" className="mt-3 text-sm text-red-600">{errorMessage}</p>}

                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                  You can manage your queue after creating the session.
                </p>
              </section>

              {/* Quick Tip */}
              <section className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <h3 className="text-sm font-semibold text-emerald-900">
                  Quick tip
                </h3>
                <p className="mt-1 text-sm leading-6 text-emerald-800/80">
                  For doubles, four players are needed for each match. Add your
                  players before setting up the live queue.
                </p>
              </section>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}
