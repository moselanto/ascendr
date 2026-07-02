-- ASCENDR — 0010: Live chat + presence, and AI Studio career artifacts
-- Adds:
--   * live_chat_messages  — realtime side chat for a live session (distinct from Q&A)
--   * session_presence    — who is currently in the room (Participants tab + "N watching")
--   * career_plans        — saved AI-generated career plans (Career Plan tab)
--   * resume_reviews      — saved resume scores + fixes (Resume Review tab)
--   * interview_sessions  — saved mock-interview transcripts + feedback (Interview Prep tab)
-- Follows existing helpers from 0002: is_community_member(uuid), is_community_mod(uuid),
-- current_profile_id(). Idempotent + safe to re-run.

-- ============================================================================
-- LIVE CHAT — a fast, ephemeral side channel that runs alongside Q&A
-- ============================================================================
create table if not exists live_chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references live_sessions(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists live_chat_session_idx on live_chat_messages(session_id, created_at);

-- ============================================================================
-- SESSION PRESENCE — one row per (session, user); heartbeat drives the
-- Participants tab and the live viewer count. "hand_raised" powers Raise hand.
-- ============================================================================
create table if not exists session_presence (
  session_id uuid references live_sessions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'viewer' check (role in ('host','cohost','viewer')),
  hand_raised boolean default false,
  last_seen_at timestamptz default now(),
  joined_at timestamptz default now(),
  primary key (session_id, user_id)
);
create index if not exists session_presence_seen_idx on session_presence(session_id, last_seen_at);

-- Upsert a heartbeat for the current user in a session (keeps last_seen fresh).
create or replace function touch_presence(p_session_id uuid, p_hand boolean default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid := current_profile_id();
begin
  if pid is null then return; end if;
  insert into session_presence (session_id, user_id, last_seen_at, hand_raised)
    values (p_session_id, pid, now(), coalesce(p_hand, false))
  on conflict (session_id, user_id) do update
    set last_seen_at = now(),
        hand_raised = coalesce(p_hand, session_presence.hand_raised);
end;
$$;

-- ============================================================================
-- AI STUDIO — saved career artifacts (all strictly per-user)
-- ============================================================================

-- Career Plan tab: a structured, AI-generated plan the user can revisit.
create table if not exists career_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  goal text not null,
  horizon text,                       -- e.g. "30 days", "6 months"
  summary text,                       -- one-line framing
  steps jsonb default '[]'::jsonb,    -- [{ title, detail, done }]
  status text default 'active' check (status in ('active','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists career_plans_user_idx on career_plans(user_id, created_at desc);

-- Resume Review tab: a score + strengths + fixes + a rewrite suggestion.
create table if not exists resume_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  file_name text,
  target_role text,
  score integer,                       -- 0..100
  verdict text,                        -- "Strong — a few quick wins"
  strengths jsonb default '[]'::jsonb, -- ["Quantified 3 achievements", ...]
  fixes jsonb default '[]'::jsonb,     -- [{ severity: 'warn'|'ok', text }]
  rewrite text,                        -- suggested rewritten bullet/summary
  created_at timestamptz default now()
);
create index if not exists resume_reviews_user_idx on resume_reviews(user_id, created_at desc);

-- Interview Prep tab: a mock-interview run with Q/A pairs + feedback.
create table if not exists interview_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  role text,                           -- role being practiced for
  kind text default 'behavioral' check (kind in ('behavioral','technical','mixed')),
  turns jsonb default '[]'::jsonb,     -- [{ question, answer, feedback, rating }]
  overall_feedback text,
  status text default 'in_progress' check (status in ('in_progress','complete')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists interview_sessions_user_idx on interview_sessions(user_id, created_at desc);

-- ============================================================================
-- RLS
-- ============================================================================
alter table live_chat_messages  enable row level security;
alter table session_presence    enable row level security;
alter table career_plans        enable row level security;
alter table resume_reviews       enable row level security;
alter table interview_sessions   enable row level security;

-- Live chat: community members can read; members can post as themselves.
drop policy if exists "live_chat_read" on live_chat_messages;
create policy "live_chat_read" on live_chat_messages
  for select using (
    exists (select 1 from live_sessions s
            where s.id = live_chat_messages.session_id
              and is_community_member(s.community_id))
  );

drop policy if exists "live_chat_insert" on live_chat_messages;
create policy "live_chat_insert" on live_chat_messages
  for insert with check (
    author_id = current_profile_id()
    and exists (select 1 from live_sessions s
                where s.id = live_chat_messages.session_id
                  and is_community_member(s.community_id))
  );

-- Mods can moderate (delete) chat in their community's sessions.
drop policy if exists "live_chat_delete_mod" on live_chat_messages;
create policy "live_chat_delete_mod" on live_chat_messages
  for delete using (
    author_id = current_profile_id()
    or exists (select 1 from live_sessions s
               where s.id = live_chat_messages.session_id
                 and is_community_mod(s.community_id))
  );

-- Presence: members of the community can see who's present; users manage own row.
drop policy if exists "presence_read" on session_presence;
create policy "presence_read" on session_presence
  for select using (
    exists (select 1 from live_sessions s
            where s.id = session_presence.session_id
              and is_community_member(s.community_id))
  );

drop policy if exists "presence_upsert_own" on session_presence;
create policy "presence_upsert_own" on session_presence
  for insert with check (user_id = current_profile_id());

drop policy if exists "presence_update_own" on session_presence;
create policy "presence_update_own" on session_presence
  for update using (user_id = current_profile_id());

drop policy if exists "presence_delete_own" on session_presence;
create policy "presence_delete_own" on session_presence
  for delete using (user_id = current_profile_id());

-- AI Studio artifacts: strictly private to the owning user.
drop policy if exists "career_plans_own" on career_plans;
create policy "career_plans_own" on career_plans
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

drop policy if exists "resume_reviews_own" on resume_reviews;
create policy "resume_reviews_own" on resume_reviews
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

drop policy if exists "interview_sessions_own" on interview_sessions;
create policy "interview_sessions_own" on interview_sessions
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

-- ============================================================================
-- Realtime: stream live chat + presence for the room. Guarded (safe re-run).
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='live_chat_messages') then
    alter publication supabase_realtime add table live_chat_messages;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='session_presence') then
    alter publication supabase_realtime add table session_presence;
  end if;
end $$;
