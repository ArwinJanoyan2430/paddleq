-- PaddleQ starter schema. Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club_name text not null default '',
  session_date date not null default current_date,
  court_count integer not null default 1 check (court_count between 1 and 8),
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  queue_position integer not null default 0,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'checked_out')),
  wins integer not null default 0,
  losses integer not null default 0,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  court_number integer not null,
  status text not null default 'queued' check (status in ('queued', 'getting_ready', 'in_progress', 'completed')),
  team_one_player_ids uuid[] not null default '{}',
  team_two_player_ids uuid[] not null default '{}',
  team_one_score integer,
  team_two_score integer,
  queue_position integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Ensure deleting a session removes its roster and matches, including when the
-- tables were created from an older schema version without cascade behavior.
alter table public.players drop constraint if exists players_session_id_fkey;
alter table public.players add constraint players_session_id_fkey
  foreign key (session_id) references public.sessions(id) on delete cascade;
alter table public.matches drop constraint if exists matches_session_id_fkey;
alter table public.matches add constraint matches_session_id_fkey
  foreign key (session_id) references public.sessions(id) on delete cascade;

create index if not exists players_session_queue_idx on public.players(session_id, status, queue_position);
create index if not exists matches_session_queue_idx on public.matches(session_id, status, queue_position);

alter table public.sessions enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;

-- Demo access for the local admin/admin gate. These policies allow any browser
-- with the public app key to read and change data. Replace with authenticated,
-- user-scoped policies before using this app with real/private data.
drop policy if exists "PaddleQ sessions authenticated access" on public.sessions;
drop policy if exists "PaddleQ players authenticated access" on public.players;
drop policy if exists "PaddleQ matches authenticated access" on public.matches;
drop policy if exists "PaddleQ sessions demo access" on public.sessions;
drop policy if exists "PaddleQ players demo access" on public.players;
drop policy if exists "PaddleQ matches demo access" on public.matches;
create policy "PaddleQ sessions demo access" on public.sessions for all to anon, authenticated using (true) with check (true);
create policy "PaddleQ players demo access" on public.players for all to anon, authenticated using (true) with check (true);
create policy "PaddleQ matches demo access" on public.matches for all to anon, authenticated using (true) with check (true);

-- RLS policies authorize rows; SQL grants authorize table operations.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.sessions to anon, authenticated;
grant select, insert, update, delete on public.players to anon, authenticated;
grant select, insert, update, delete on public.matches to anon, authenticated;

-- Assign a waiting quartet and mark them as playing in one transaction.
create or replace function public.paddleq_assign_match(
  p_session_id uuid,
  p_court_number integer,
  p_team_one_player_ids uuid[],
  p_team_two_player_ids uuid[]
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_match_id uuid;
  v_selected_ids uuid[] := p_team_one_player_ids || p_team_two_player_ids;
  v_selected_count integer;
begin
  if cardinality(p_team_one_player_ids) <> 2 or cardinality(p_team_two_player_ids) <> 2 then
    raise exception 'A doubles match needs two players on each team.';
  end if;
  if (select count(distinct selected.player_id) from unnest(v_selected_ids) as selected(player_id)) <> 4 then
    raise exception 'Each player must appear only once in a match.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_session_id::text || ':' || p_court_number::text, 0));

  if not exists (
    select 1 from public.sessions
    where id = p_session_id and status = 'active' and p_court_number between 1 and court_count
  ) then
    raise exception 'The session or court is not available.';
  end if;
  if exists (
    select 1 from public.matches
    where session_id = p_session_id and court_number = p_court_number
      and status in ('getting_ready', 'in_progress')
  ) then
    raise exception 'That court is already occupied.';
  end if;

  perform 1 from public.players
  where session_id = p_session_id and id = any(v_selected_ids) and status = 'waiting'
  for update;
  get diagnostics v_selected_count = row_count;
  if v_selected_count <> 4 then
    raise exception 'One or more selected players are no longer waiting.';
  end if;

  insert into public.matches (
    session_id, court_number, status, started_at,
    team_one_player_ids, team_two_player_ids, queue_position
  ) values (
    p_session_id, p_court_number, 'in_progress', now(),
    p_team_one_player_ids, p_team_two_player_ids, 0
  ) returning id into v_match_id;

  update public.players set status = 'playing' where id = any(v_selected_ids);
  return v_match_id;
end;
$$;

-- Save the winner, update standings, and return players to the queue atomically.
create or replace function public.paddleq_finish_match(
  p_match_id uuid,
  p_winning_team integer
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_next_position integer;
begin
  if p_winning_team is null or p_winning_team not in (1, 2) then
    raise exception 'Choose team 1 or team 2 as the winner.';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found or v_match.status <> 'in_progress' then
    raise exception 'This match is no longer in progress.';
  end if;

  -- Serialize completed-match queue positions for this session.
  perform 1 from public.sessions where id = v_match.session_id for update;

  select coalesce(max(queue_position), -1) + 1 into v_next_position
  from public.players where session_id = v_match.session_id;

  update public.matches set
    status = 'completed',
    completed_at = now(),
    team_one_score = case when p_winning_team = 1 then 1 else 0 end,
    team_two_score = case when p_winning_team = 2 then 1 else 0 end
  where id = p_match_id;

  with roster as (
    select player_id, 1 as team_number, team_position
    from unnest(v_match.team_one_player_ids) with ordinality as team(player_id, team_position)
    union all
    select player_id, 2 as team_number, team_position
    from unnest(v_match.team_two_player_ids) with ordinality as team(player_id, team_position)
  ), ordered_roster as (
    select player_id, team_number,
      row_number() over (order by team_number, team_position) as queue_offset
    from roster
  )
  update public.players as player set
    status = 'waiting',
    queue_position = v_next_position + ordered_roster.queue_offset - 1,
    wins = player.wins + case when ordered_roster.team_number = p_winning_team then 1 else 0 end,
    losses = player.losses + case when ordered_roster.team_number <> p_winning_team then 1 else 0 end,
    points = player.points + case when ordered_roster.team_number = p_winning_team then 3 else 0 end
  from ordered_roster
  where player.id = ordered_roster.player_id and player.session_id = v_match.session_id;
end;
$$;

-- Remove a completed match and reverse its player stats atomically.
create or replace function public.paddleq_delete_match(
  p_match_id uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_winning_team integer;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'This match no longer exists.';
  end if;
  if v_match.status <> 'completed' then
    raise exception 'Only completed matches can be removed from match history.';
  end if;

  -- Serialize result corrections against other match updates in this session.
  perform 1 from public.sessions where id = v_match.session_id for update;

  v_winning_team := case
    when v_match.team_one_score > v_match.team_two_score then 1
    when v_match.team_two_score > v_match.team_one_score then 2
    else 0
  end;

  if v_winning_team <> 0 then
    update public.players as player set
      wins = greatest(0, player.wins - case when v_winning_team = 1 then 1 else 0 end),
      losses = greatest(0, player.losses - case when v_winning_team = 2 then 1 else 0 end),
      points = greatest(0, player.points - case when v_winning_team = 1 then 3 else 0 end)
    where player.session_id = v_match.session_id
      and player.id = any(v_match.team_one_player_ids);

    update public.players as player set
      wins = greatest(0, player.wins - case when v_winning_team = 2 then 1 else 0 end),
      losses = greatest(0, player.losses - case when v_winning_team = 1 then 1 else 0 end),
      points = greatest(0, player.points - case when v_winning_team = 2 then 3 else 0 end)
    where player.session_id = v_match.session_id
      and player.id = any(v_match.team_two_player_ids);
  end if;

  delete from public.matches where id = p_match_id;
end;
$$;

grant execute on function public.paddleq_assign_match(uuid, integer, uuid[], uuid[]) to anon, authenticated;
grant execute on function public.paddleq_finish_match(uuid, integer) to anon, authenticated;
grant execute on function public.paddleq_delete_match(uuid) to anon, authenticated;
notify pgrst, 'reload schema';

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;
