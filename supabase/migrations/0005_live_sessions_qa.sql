-- ASCENDR — 0005: Live Sessions + Q&A
-- live_sessions + live_questions exist from 0001. This adds per-user question
-- votes (one vote per user per question), keeps live_questions.votes in sync via
-- triggers, and adds membership-scoped RLS. Idempotent + safe to re-run.

-- ============ question_votes: one row per (question, user) ============
create table if not exists question_votes (
  question_id uuid references live_questions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (question_id, user_id)
);

-- Keep live_questions.votes accurate as votes are added/removed.
create or replace function bump_question_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update live_questions set votes = votes + 1 where id = new.question_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update live_questions set votes = greatest(votes - 1, 0) where id = old.question_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_question_votes on question_votes;
create trigger trg_question_votes
  after insert or delete on question_votes
  for each row execute function bump_question_votes();

-- ============ RLS ============
alter table live_sessions   enable row level security;
alter table live_questions  enable row level security;
alter table question_votes  enable row level security;

-- Live sessions: members of the community can read; owners/mods manage.
drop policy if exists "live_sessions_read" on live_sessions;
create policy "live_sessions_read" on live_sessions
  for select using (is_community_member(community_id));

drop policy if exists "live_sessions_write" on live_sessions;
create policy "live_sessions_write" on live_sessions
  for all using (is_community_mod(community_id))
  with check (is_community_mod(community_id));

-- Questions: any community member can read; members can ask; mods can update status.
drop policy if exists "live_questions_read" on live_questions;
create policy "live_questions_read" on live_questions
  for select using (
    exists (select 1 from live_sessions s
            where s.id = live_questions.session_id
              and is_community_member(s.community_id))
  );

drop policy if exists "live_questions_insert" on live_questions;
create policy "live_questions_insert" on live_questions
  for insert with check (
    author_id = current_profile_id()
    and exists (select 1 from live_sessions s
                where s.id = live_questions.session_id
                  and is_community_member(s.community_id))
  );

drop policy if exists "live_questions_update" on live_questions;
create policy "live_questions_update" on live_questions
  for update using (
    exists (select 1 from live_sessions s
            where s.id = live_questions.session_id
              and is_community_mod(s.community_id))
  );

-- Votes: members can see counts (via read of own/others is fine); manage own only.
drop policy if exists "question_votes_read" on question_votes;
create policy "question_votes_read" on question_votes
  for select using (
    exists (select 1 from live_questions q
            join live_sessions s on s.id = q.session_id
            where q.id = question_votes.question_id
              and is_community_member(s.community_id))
  );

drop policy if exists "question_votes_insert_own" on question_votes;
create policy "question_votes_insert_own" on question_votes
  for insert with check (
    user_id = current_profile_id()
    and exists (select 1 from live_questions q
                join live_sessions s on s.id = q.session_id
                where q.id = question_votes.question_id
                  and is_community_member(s.community_id))
  );

drop policy if exists "question_votes_delete_own" on question_votes;
create policy "question_votes_delete_own" on question_votes
  for delete using (user_id = current_profile_id());

-- ============ Realtime: stream questions + votes for the live board ============
alter publication supabase_realtime add table live_questions;
alter publication supabase_realtime add table question_votes;
