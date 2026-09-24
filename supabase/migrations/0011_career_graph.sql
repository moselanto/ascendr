-- ASCENDR — 0011: Career Graph foundation
--
-- Adds the Person → Skills → Goals → Opportunities → Outcomes spine that the
-- Career Intelligence repositioning depends on. Purely additive: no existing
-- table is altered destructively and no existing behaviour changes.
--
-- Conventions follow 0002_rls_policies.sql:
--   * profiles.id is the app-level identity (NOT auth.users.id)
--   * current_profile_id() resolves the caller's profile id
--   * server-side work runs as service_role and bypasses RLS
--
-- Run AFTER 0010_live_chat_presence_ai_studio.sql. Idempotent.

-- pgvector is already enabled by 0001; restated for standalone safety.
create extension if not exists vector;


-- ============================================================
-- SKILLS — canonical taxonomy (seeded from ESCO)
-- ============================================================
-- Free-text skills cannot be diffed, scored or aggregated, so every skill
-- reference in the product resolves to a row here. external_id holds the ESCO
-- concept URI so the taxonomy can be re-synced without losing local mappings.

create table if not exists skills (
  id            uuid primary key default uuid_generate_v4(),
  external_id   text unique,                  -- ESCO concept URI
  source        text not null default 'esco'  check (source in ('esco','onet','custom')),
  preferred_label text not null,
  alt_labels    text[] default '{}',
  description   text,
  skill_type    text check (skill_type in ('knowledge','skill','transversal','language')),
  group_path    text[],                       -- ESCO hierarchy, top→leaf
  embedding     vector(1536),                 -- text-embedding-3-small
  created_at    timestamptz default now()
);

create index if not exists skills_label_trgm_idx
  on skills using gin (preferred_label gin_trgm_ops);
create index if not exists skills_source_idx on skills (source);

-- HNSW needs pgvector >= 0.5 (Supabase has it). Falls back cleanly if absent.
do $$
begin
  execute 'create index if not exists skills_embedding_idx
             on skills using hnsw (embedding vector_cosine_ops)';
exception when others then
  raise notice 'HNSW unavailable, skipping skills_embedding_idx: %', sqlerrm;
end $$;

comment on table skills is
  'Canonical skill vocabulary seeded from ESCO (13,485 concepts). All user and
   role skill references point here so gaps are a computable set difference.';


-- ============================================================
-- ROLE PROFILES — what a target role actually requires
-- ============================================================
-- Seeded from ESCO occupations (ISCO-08 mapped), then refined with skills
-- extracted from real job descriptions ingested in Phase 3.

create table if not exists role_profiles (
  id            uuid primary key default uuid_generate_v4(),
  external_id   text unique,                  -- ESCO occupation URI
  isco_code     text,
  title         text not null,
  alt_titles    text[] default '{}',
  description   text,
  embedding     vector(1536),
  created_at    timestamptz default now()
);

create table if not exists role_required_skills (
  role_id       uuid references role_profiles(id) on delete cascade,
  skill_id      uuid references skills(id) on delete cascade,
  importance    text not null default 'essential'
                  check (importance in ('essential','optional')),
  -- 0..1, learned from JD frequency once Phase 3 ingestion runs
  weight        numeric(4,3) default 0.500 check (weight >= 0 and weight <= 1),
  primary key (role_id, skill_id)
);

create index if not exists role_required_skills_skill_idx
  on role_required_skills (skill_id);


-- ============================================================
-- USER SKILLS — what the member actually has
-- ============================================================

create table if not exists user_skills (
  user_id       uuid references profiles(id) on delete cascade,
  skill_id      uuid references skills(id) on delete cascade,
  proficiency   smallint check (proficiency between 1 and 5),
  -- how we learned this, for the "why" explanation in the UI
  evidence      text not null default 'self_reported'
                  check (evidence in ('self_reported','resume','assessment','course','endorsement','inferred')),
  evidence_ref  uuid,                         -- optional pointer to source row
  confidence    numeric(4,3) default 1.000 check (confidence >= 0 and confidence <= 1),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  primary key (user_id, skill_id)
);

create index if not exists user_skills_skill_idx on user_skills (skill_id);

alter table user_skills enable row level security;

create policy "user_skills_read_own" on user_skills
  for select using (user_id = current_profile_id());
create policy "user_skills_write_own" on user_skills
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

comment on table user_skills is
  'Private by default. Skill visibility to other members is governed by
   profile_privacy, not by exposing this table directly.';


-- ============================================================
-- CAREER GOALS — promote profiles.career_goal to a real entity
-- ============================================================
-- 0008 put career_goal (4-value enum) + target_roles[] on profiles. That is
-- too thin to hang analysis off. This keeps those columns intact for backwards
-- compatibility and backfills from them below.

create table if not exists career_goals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles(id) on delete cascade,
  kind            text not null default 'switch'
                    check (kind in ('switch','promote','startup','learn')),
  target_role_id  uuid references role_profiles(id),
  target_title    text,                       -- free text before resolution
  target_industry text,
  target_companies text[] default '{}',
  location_pref   text,
  horizon_months  smallint default 6,
  status          text not null default 'active'
                    check (status in ('active','achieved','paused','abandoned')),
  created_at      timestamptz default now(),
  achieved_at     timestamptz
);

create index if not exists career_goals_user_idx on career_goals (user_id, status);

alter table career_goals enable row level security;

create policy "career_goals_read_own" on career_goals
  for select using (user_id = current_profile_id());
create policy "career_goals_write_own" on career_goals
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

-- Backfill one goal per already-onboarded profile so existing users are not
-- dropped into an empty state after deploy.
insert into career_goals (user_id, kind, target_title)
select p.id,
       p.career_goal,
       nullif(coalesce(p.target_roles[1], ''), '')
from profiles p
where p.career_goal is not null
  and not exists (select 1 from career_goals g where g.user_id = p.id);


-- ============================================================
-- CAREER ACTIONS — the ledger that makes "Career Momentum" real
-- ============================================================
-- Replaces the marketing meaning of xp_events without touching that table.
-- xp_events stays as-is for community leaderboards.

create table if not exists career_actions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade,
  goal_id       uuid references career_goals(id) on delete set null,
  kind          text not null
                  check (kind in ('skill_practiced','course_completed','assessment_passed',
                                  'mentor_contacted','mentor_session','community_joined',
                                  'application_sent','interview_completed','intro_requested',
                                  'plan_step_completed','profile_updated')),
  title         text not null,
  detail        text,
  -- what this action was about, for the graph projection
  skill_id      uuid references skills(id) on delete set null,
  related_type  text,   -- 'profile' | 'community' | 'opportunity' | 'plan_step'
  related_id    uuid,
  momentum      smallint not null default 1,
  status        text not null default 'completed'
                  check (status in ('suggested','accepted','completed','skipped')),
  suggested_by  text default 'user' check (suggested_by in ('user','ai','system')),
  created_at    timestamptz default now(),
  completed_at  timestamptz default now()
);

create index if not exists career_actions_user_idx on career_actions (user_id, created_at desc);
create index if not exists career_actions_goal_idx on career_actions (goal_id);

alter table career_actions enable row level security;

create policy "career_actions_read_own" on career_actions
  for select using (user_id = current_profile_id());
create policy "career_actions_write_own" on career_actions
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());


-- ============================================================
-- CAREER OUTCOMES — the metric the funding story rests on
-- ============================================================
-- Section 17 of the strategy memo: report outcomes, not user counts.

create table if not exists career_outcomes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade,
  goal_id       uuid references career_goals(id) on delete set null,
  kind          text not null
                  check (kind in ('interview','offer','job_started','promotion','raise',
                                  'introduction_made','skill_certified','project_won','funding_raised')),
  title         text,
  organization  text,
  -- self-reported unless a partner confirms it; keep the distinction honest
  verification  text not null default 'self_reported'
                  check (verification in ('self_reported','partner_confirmed','document_verified')),
  occurred_on   date not null default current_date,
  created_at    timestamptz default now()
);

create index if not exists career_outcomes_user_idx on career_outcomes (user_id, occurred_on desc);

alter table career_outcomes enable row level security;

create policy "career_outcomes_read_own" on career_outcomes
  for select using (user_id = current_profile_id());
create policy "career_outcomes_write_own" on career_outcomes
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());


-- ============================================================
-- PRIVACY — explicit controls before any network feature ships
-- ============================================================

create table if not exists profile_privacy (
  user_id            uuid primary key references profiles(id) on delete cascade,
  profile_visibility text not null default 'members'
                       check (profile_visibility in ('public','members','communities','private')),
  skills_visible     boolean not null default true,
  goal_visible       boolean not null default false,
  open_to_mentoring  boolean not null default false,
  open_to_intros     boolean not null default true,
  open_to_opportunities boolean not null default false,
  updated_at         timestamptz default now()
);

alter table profile_privacy enable row level security;

create policy "profile_privacy_read_own" on profile_privacy
  for select using (user_id = current_profile_id());
create policy "profile_privacy_write_own" on profile_privacy
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

insert into profile_privacy (user_id)
select id from profiles
on conflict (user_id) do nothing;


-- ============================================================
-- USAGE QUOTAS — abuse control now, plan enforcement later
-- ============================================================
-- Doubles as the monetization substrate: the same counter that stops runaway
-- OpenAI spend today enforces Free/Pro/Premium limits later.

create table if not exists usage_counters (
  user_id      uuid references profiles(id) on delete cascade,
  bucket       text not null,          -- e.g. 'ai:coach', 'ai:career-plan'
  window_start timestamptz not null,
  count        integer not null default 0,
  tokens       integer not null default 0,
  primary key (user_id, bucket, window_start)
);

create index if not exists usage_counters_window_idx on usage_counters (window_start);

alter table usage_counters enable row level security;
-- Read-only to the owner so the UI can show "3 of 10 analyses left today".
-- Writes happen server-side via consume_quota() as service_role.
create policy "usage_counters_read_own" on usage_counters
  for select using (user_id = current_profile_id());

/**
 * Atomically consume one unit of quota.
 * Returns (allowed, used, remaining, resets_at).
 *
 * Fixed-window, which is adequate for cost control and far simpler than a
 * sliding window. One round trip, no extra infrastructure.
 */
create or replace function consume_quota(
  p_user_id       uuid,
  p_bucket        text,
  p_limit         integer,
  p_window_secs   integer default 86400,
  p_tokens        integer default 0
)
returns table (allowed boolean, used integer, remaining integer, resets_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_secs) * p_window_secs
  );

  insert into usage_counters (user_id, bucket, window_start, count, tokens)
  values (p_user_id, p_bucket, v_window_start, 1, p_tokens)
  on conflict (user_id, bucket, window_start) do update
    set count  = usage_counters.count + 1,
        tokens = usage_counters.tokens + p_tokens
  returning usage_counters.count into v_count;

  -- Over budget: roll back this increment so a hammering client cannot
  -- inflate the counter indefinitely.
  if v_count > p_limit then
    update usage_counters
       set count = usage_counters.count - 1
     where usage_counters.user_id = p_user_id
       and usage_counters.bucket = p_bucket
       and usage_counters.window_start = v_window_start;

    return query select false, p_limit, 0, v_window_start + make_interval(secs => p_window_secs);
  else
    return query select true, v_count, p_limit - v_count,
                        v_window_start + make_interval(secs => p_window_secs);
  end if;
end;
$$;

revoke all on function consume_quota(uuid, text, integer, integer, integer) from public, anon, authenticated;


-- ============================================================
-- ANALYTICS — Section 25 is unmeasurable without this
-- ============================================================

create table if not exists analytics_events (
  id          bigserial primary key,
  user_id     uuid references profiles(id) on delete set null,
  name        text not null,   -- 'goal_created', 'analysis_viewed', 'mentor_contacted'
  props       jsonb default '{}'::jsonb,
  session_id  text,
  created_at  timestamptz default now()
);

create index if not exists analytics_events_name_idx on analytics_events (name, created_at desc);
create index if not exists analytics_events_user_idx on analytics_events (user_id, created_at desc);

alter table analytics_events enable row level security;
-- Write-only from the server; nothing client-readable.


-- ============================================================
-- ACTIVATION METRICS — the three funding milestones, as SQL
-- ============================================================
-- Strategy memo Section 14. Kept as a view so the numbers in a deck and the
-- numbers in the product can never drift apart.

create or replace view career_activation_metrics as
with cohort as (
  select id as user_id, created_at from profiles
)
select
  count(*)                                                     as total_members,
  count(*) filter (where exists (
    select 1 from career_goals g where g.user_id = c.user_id))  as with_goal,
  count(*) filter (where exists (
    select 1 from career_actions a
     where a.user_id = c.user_id
       and a.kind in ('mentor_contacted','mentor_session','community_joined','intro_requested')
       and a.status = 'completed'))                             as network_activated,
  count(*) filter (where exists (
    select 1 from career_actions a
     where a.user_id = c.user_id
       and a.status = 'completed'
       and a.created_at <= c.created_at + interval '7 days'))   as acted_within_7d,
  count(*) filter (where exists (
    select 1 from career_outcomes o
     where o.user_id = c.user_id
       and o.occurred_on <= (c.created_at + interval '90 days')::date)) as outcome_within_90d
from cohort c;
