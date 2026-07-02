-- ASCENDR — 0009: Live session polls
-- Host-created polls inside a live session, with one vote per user per poll.
-- Mirrors the RLS + realtime conventions of 0005 (live Q&A). Idempotent.

-- ============ live_polls ============
create table if not exists live_polls (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references live_sessions(id) on delete cascade,
  created_by uuid references profiles(id),
  question text not null,
  options jsonb not null default '[]'::jsonb,   -- array of option strings
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz default now()
);

-- ============ live_poll_votes: one row per (poll, user) ============
create table if not exists live_poll_votes (
  poll_id uuid references live_polls(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz default now(),
  primary key (poll_id, user_id)
);

create index if not exists idx_live_polls_session on live_polls(session_id);
create index if not exists idx_live_poll_votes_poll on live_poll_votes(poll_id);

-- ============ RLS ============
alter table live_polls      enable row level security;
alter table live_poll_votes enable row level security;

-- Polls: any community member of the session can read; only mods create/close.
drop policy if exists "live_polls_read" on live_polls;
create policy "live_polls_read" on live_polls
  for select using (
    exists (select 1 from live_sessions s
            where s.id = live_polls.session_id
              and is_community_member(s.community_id))
  );

drop policy if exists "live_polls_write" on live_polls;
create policy "live_polls_write" on live_polls
  for all using (
    exists (select 1 from live_sessions s
            where s.id = live_polls.session_id
              and is_community_mod(s.community_id))
  )
  with check (
    exists (select 1 from live_sessions s
            where s.id = live_polls.session_id
              and is_community_mod(s.community_id))
  );

-- Votes: members can read counts; each user manages only their own vote.
drop policy if exists "live_poll_votes_read" on live_poll_votes;
create policy "live_poll_votes_read" on live_poll_votes
  for select using (
    exists (select 1 from live_polls p
            join live_sessions s on s.id = p.session_id
            where p.id = live_poll_votes.poll_id
              and is_community_member(s.community_id))
  );

drop policy if exists "live_poll_votes_insert_own" on live_poll_votes;
create policy "live_poll_votes_insert_own" on live_poll_votes
  for insert with check (
    user_id = current_profile_id()
    and exists (select 1 from live_polls p
                join live_sessions s on s.id = p.session_id
                where p.id = live_poll_votes.poll_id
                  and p.status = 'open'
                  and is_community_member(s.community_id))
  );

drop policy if exists "live_poll_votes_update_own" on live_poll_votes;
create policy "live_poll_votes_update_own" on live_poll_votes
  for update using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

drop policy if exists "live_poll_votes_delete_own" on live_poll_votes;
create policy "live_poll_votes_delete_own" on live_poll_votes
  for delete using (user_id = current_profile_id());

-- ============ Realtime: stream polls + votes ============
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='live_polls') then
    alter publication supabase_realtime add table live_polls;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='live_poll_votes') then
    alter publication supabase_realtime add table live_poll_votes;
  end if;
end $$;
