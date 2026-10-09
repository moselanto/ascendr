-- 0012: Opportunity tracker (saved roles and their stage).
-- Idempotent; run after 0011 in the Supabase SQL editor.

create table if not exists saved_opportunities (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  external_id  text not null,              -- job id from the source feed
  title        text not null,
  company      text not null,
  location     text,
  url          text,
  source       text,                       -- greenhouse | lever | ashby | manual
  status       text not null default 'saved'
                 check (status in ('saved','applied','interviewing','offer','closed')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, external_id)
);

create index if not exists saved_opportunities_user_idx on saved_opportunities (user_id, updated_at desc);

alter table saved_opportunities enable row level security;

drop policy if exists "saved_opportunities_own" on saved_opportunities;
create policy "saved_opportunities_own" on saved_opportunities
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());
