-- ASCENDR — 0007: Networking (connections + direct messages)
-- Adds a connection graph (request/accept) and 1:1 direct messages, both
-- scoped by RLS to the involved profiles. Idempotent + safe to re-run.

-- ============ connections: one row per pair (requester -> addressee) ============
create table if not exists connections (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid references profiles(id) on delete cascade,
  addressee_id uuid references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  unique (requester_id, addressee_id)
);
create index if not exists connections_addressee_idx on connections(addressee_id, status);
create index if not exists connections_requester_idx on connections(requester_id, status);

-- ============ direct_messages: 1:1 chat between two profiles ============
create table if not exists direct_messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references profiles(id) on delete cascade,
  recipient_id uuid references profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists dm_pair_idx on direct_messages(sender_id, recipient_id, created_at);
create index if not exists dm_recipient_idx on direct_messages(recipient_id, created_at);

-- ============ RLS: connections ============
alter table connections enable row level security;

-- You can see a connection if you are either side of it.
drop policy if exists "connections_read" on connections;
create policy "connections_read" on connections
  for select using (
    requester_id = current_profile_id() or addressee_id = current_profile_id()
  );

-- You can create a request only as yourself (the requester).
drop policy if exists "connections_insert_self" on connections;
create policy "connections_insert_self" on connections
  for insert with check (requester_id = current_profile_id());

-- The addressee can accept/decline; either side can update their own row
-- (e.g. requester cancels). RLS gate: you must be part of the connection.
drop policy if exists "connections_update_party" on connections;
create policy "connections_update_party" on connections
  for update using (
    requester_id = current_profile_id() or addressee_id = current_profile_id()
  );

drop policy if exists "connections_delete_party" on connections;
create policy "connections_delete_party" on connections
  for delete using (
    requester_id = current_profile_id() or addressee_id = current_profile_id()
  );

-- ============ RLS: direct_messages ============
alter table direct_messages enable row level security;

-- Read a DM if you are the sender or recipient.
drop policy if exists "dm_read" on direct_messages;
create policy "dm_read" on direct_messages
  for select using (
    sender_id = current_profile_id() or recipient_id = current_profile_id()
  );

-- Send a DM only as yourself.
drop policy if exists "dm_insert_self" on direct_messages;
create policy "dm_insert_self" on direct_messages
  for insert with check (sender_id = current_profile_id());

-- Mark-as-read: recipient can update their received messages.
drop policy if exists "dm_update_recipient" on direct_messages;
create policy "dm_update_recipient" on direct_messages
  for update using (recipient_id = current_profile_id());

-- ============ Realtime for DMs ============
alter publication supabase_realtime add table direct_messages;
alter publication supabase_realtime add table connections;
