-- Enable pgcrypto for gen_random_uuid
create extension if not exists "pgcrypto";

-- ---- Enums ----
create type member_role as enum ('owner', 'member');
create type draft_status as enum ('pending', 'approved');
create type score_source as enum ('castaway', 'wager', 'sole_survivor');

-- ---- Profiles ----
-- id = Clerk user id (text, not uuid)
create table profiles (
  id text primary key,
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- ---- Seasons ----
create table seasons (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  name text not null,
  total_episodes int not null default 13,
  fsg_recap_url text not null,
  -- weekday 0=Sun..6=Sat, hour in ET (24h)
  episode_lock_weekday int not null default 3, -- Wednesday
  episode_lock_hour_et int not null default 20  -- 8pm ET
);

-- ---- Castaways ----
create table castaways (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  image_url text,
  tribe text,
  is_eliminated boolean not null default false,
  eliminated_episode int
);

-- ---- Leagues ----
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  season_id uuid not null references seasons(id),
  owner_id text not null references profiles(id),
  created_at timestamptz not null default now()
);

-- ---- League members ----
create table league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  profile_id text not null references profiles(id),
  role member_role not null default 'member',
  castaway_points int not null default 0,
  vote_points int not null default 0,
  joined_at timestamptz not null default now(),
  unique (league_id, profile_id)
);

-- ---- Preference rankings ----
create table preference_rankings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references league_members(id) on delete cascade,
  castaway_id uuid not null references castaways(id) on delete cascade,
  rank int not null,
  unique (member_id, castaway_id)
);

-- ---- Team assignments ----
create table team_assignments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references league_members(id) on delete cascade,
  castaway_id uuid not null references castaways(id),
  slot int not null check (slot in (1, 2)),
  unique (member_id, slot)
);

-- ---- Weekly wagers ----
create table weekly_wagers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references league_members(id) on delete cascade,
  episode_number int not null,
  budget_allocations jsonb not null default '{}',
  extra_wagers jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  locked boolean not null default false,
  unique (member_id, episode_number)
);

-- ---- Sole survivor picks ----
create table sole_survivor_picks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references league_members(id) on delete cascade,
  castaway_id uuid not null references castaways(id),
  selected_at_episode int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---- Episode imports ----
create table episode_imports (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  episode_number int not null,
  raw_facts jsonb not null,
  source_url text not null,
  imported_at timestamptz not null default now(),
  unique (season_id, episode_number)
);

-- ---- Score drafts ----
create table score_drafts (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  episode_import_id uuid not null references episode_imports(id),
  status draft_status not null default 'pending',
  deltas jsonb not null default '[]',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text references profiles(id)
);

-- ---- Score ledger ----
create table score_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references league_members(id) on delete cascade,
  episode_number int not null,
  source score_source not null,
  delta_castaway_points int not null default 0,
  delta_vote_points int not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

-- ---- Admin audit log ----
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id),
  actor_id text references profiles(id),
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ================================================================
-- Private helper functions (used by RLS policies)
-- ================================================================
create schema if not exists private;

create or replace function private.is_league_member(target_league_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from league_members
    where league_id = target_league_id
      and profile_id = (auth.jwt()->>'sub')
  );
$$;

create or replace function private.is_league_admin(target_league_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from league_members
    where league_id = target_league_id
      and profile_id = (auth.jwt()->>'sub')
      and role = 'owner'
  );
$$;

create or replace function private.is_own_member(target_member_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from league_members
    where id = target_member_id
      and profile_id = (auth.jwt()->>'sub')
  );
$$;

-- ================================================================
-- RLS
-- ================================================================
alter table profiles enable row level security;
alter table seasons enable row level security;
alter table castaways enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table preference_rankings enable row level security;
alter table team_assignments enable row level security;
alter table weekly_wagers enable row level security;
alter table sole_survivor_picks enable row level security;
alter table episode_imports enable row level security;
alter table score_drafts enable row level security;
alter table score_ledger enable row level security;
alter table admin_audit_log enable row level security;

-- profiles: own row
create policy "profiles_select_own" on profiles for select using (id = (auth.jwt()->>'sub'));
create policy "profiles_insert_own" on profiles for insert with check (id = (auth.jwt()->>'sub'));
create policy "profiles_update_own" on profiles for update using (id = (auth.jwt()->>'sub'));

-- seasons and castaways: any authenticated user can read
create policy "seasons_select" on seasons for select using (auth.role() = 'authenticated');
create policy "castaways_select" on castaways for select using (auth.role() = 'authenticated');

-- leagues
create policy "leagues_select" on leagues for select using (private.is_league_member(id));
create policy "leagues_insert" on leagues for insert with check ((auth.jwt()->>'sub') = owner_id);

-- league_members
create policy "league_members_select" on league_members for select using (private.is_league_member(league_id));
create policy "league_members_insert" on league_members for insert with check (profile_id = (auth.jwt()->>'sub'));

-- preference_rankings
create policy "rankings_select" on preference_rankings for select using (
  exists (select 1 from league_members lm where lm.id = member_id and private.is_league_member(lm.league_id))
);
create policy "rankings_insert" on preference_rankings for insert with check (private.is_own_member(member_id));
create policy "rankings_update" on preference_rankings for update using (private.is_own_member(member_id));
create policy "rankings_delete" on preference_rankings for delete using (private.is_own_member(member_id));

-- team_assignments
create policy "assignments_select" on team_assignments for select using (
  exists (select 1 from league_members lm where lm.id = member_id and private.is_league_member(lm.league_id))
);

-- weekly_wagers
create policy "wagers_select" on weekly_wagers for select using (
  exists (select 1 from league_members lm where lm.id = member_id and private.is_league_member(lm.league_id))
);
create policy "wagers_insert" on weekly_wagers for insert with check (private.is_own_member(member_id));
create policy "wagers_update" on weekly_wagers for update using (private.is_own_member(member_id) and locked = false);

-- sole_survivor_picks
create policy "sole_survivor_select" on sole_survivor_picks for select using (
  exists (select 1 from league_members lm where lm.id = member_id and private.is_league_member(lm.league_id))
);
create policy "sole_survivor_insert" on sole_survivor_picks for insert with check (private.is_own_member(member_id));
create policy "sole_survivor_update" on sole_survivor_picks for update using (private.is_own_member(member_id));

-- episode_imports: readable by league members of leagues in that season
create policy "episode_imports_select" on episode_imports for select using (
  exists (
    select 1 from leagues l
    join league_members lm on lm.league_id = l.id
    where l.season_id = episode_imports.season_id
      and lm.profile_id = (auth.jwt()->>'sub')
  )
);

-- score_drafts
create policy "score_drafts_select" on score_drafts for select using (private.is_league_member(league_id));

-- score_ledger
create policy "score_ledger_select" on score_ledger for select using (
  exists (select 1 from league_members lm where lm.id = member_id and private.is_league_member(lm.league_id))
);

-- admin_audit_log
create policy "audit_select" on admin_audit_log for select using (private.is_league_admin(league_id));

-- ================================================================
-- Atomic score approval RPC (called by API route, runs as service role)
-- ================================================================
create or replace function approve_score_draft(
  p_draft_id uuid,
  p_approver text
)
returns void language plpgsql security definer as $$
declare
  v_draft score_drafts%rowtype;
  v_delta jsonb;
  v_member_id uuid;
  v_league_id uuid;
  v_episode_number int;
begin
  -- Lock and fetch draft
  select * into v_draft from score_drafts where id = p_draft_id for update;

  if not found then
    raise exception 'Draft not found';
  end if;

  if v_draft.status = 'approved' then
    -- Idempotent: already approved
    return;
  end if;

  v_league_id := v_draft.league_id;

  -- Get episode number from import
  select episode_number into v_episode_number
  from episode_imports where id = v_draft.episode_import_id;

  -- Apply deltas
  for v_delta in select * from jsonb_array_elements(v_draft.deltas)
  loop
    v_member_id := (v_delta->>'memberId')::uuid;

    -- Insert ledger row
    insert into score_ledger (member_id, episode_number, source, delta_castaway_points, delta_vote_points, reason)
    values (
      v_member_id,
      v_episode_number,
      'castaway',
      (v_delta->>'deltaCastawayPoints')::int,
      (v_delta->>'deltaVotePoints')::int,
      'episode ' || v_episode_number || ' draft approved'
    );

    -- Update member totals
    update league_members
    set
      castaway_points = castaway_points + (v_delta->>'deltaCastawayPoints')::int,
      vote_points = vote_points + (v_delta->>'deltaVotePoints')::int
    where id = v_member_id;
  end loop;

  -- Mark approved
  update score_drafts
  set status = 'approved', approved_at = now(), approved_by = p_approver
  where id = p_draft_id;

  -- Audit
  insert into admin_audit_log (league_id, actor_id, action, payload)
  values (v_league_id, p_approver, 'approve_score_draft', jsonb_build_object('draft_id', p_draft_id));
end;
$$;
