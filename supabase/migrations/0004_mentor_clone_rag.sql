-- ASCENDR — 0004: Mentor Clone (RAG) support
-- Adds source text + chunk metadata, a vector-search RPC, AI conversation storage,
-- and RLS. Run AFTER 0001-0003. Requires the `vector` extension (enabled in 0001).
--
-- NOTE: 0001 created ai_sources + ai_chunks but NOT ai_conversations / ai_messages.
-- This migration creates those tables if missing, so it is safe to run standalone.

-- ============ ai_conversations / ai_messages (created here — absent in 0001) ============
create table if not exists ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  community_id uuid references communities(id) on delete cascade,
  kind text default 'coach' check (kind in ('coach','mentor_clone')),
  title text,
  created_at timestamptz default now()
);

create table if not exists ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create index if not exists ai_messages_conv_idx on ai_messages(conversation_id);

-- ============ ai_sources: keep original text + a title for citations ============
alter table ai_sources add column if not exists title text;
alter table ai_sources add column if not exists content text;

-- ============ ai_chunks: source/community + position for citation labels ============
alter table ai_chunks add column if not exists community_id uuid references communities(id) on delete cascade;
alter table ai_chunks add column if not exists owner_id uuid references profiles(id);
alter table ai_chunks add column if not exists source_title text;
alter table ai_chunks add column if not exists chunk_index integer default 0;

-- Index for fast vector similarity search (cosine).
create index if not exists ai_chunks_embedding_idx
  on ai_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============ Vector search RPC: top-k chunks for a community, scoped + safe ============
-- SECURITY DEFINER so retrieval happens server-side (PRD AI isolation),
-- but gated to communities the caller is a member of.
create or replace function match_ai_chunks(
  p_community_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 5
)
returns table (
  id uuid,
  content text,
  source_title text,
  chunk_index int,
  similarity float
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Only members of the community may retrieve its mentor-clone chunks.
  if not is_community_member(p_community_id) then
    return;
  end if;

  return query
    select
      c.id,
      c.content,
      c.source_title,
      c.chunk_index,
      1 - (c.embedding <=> p_query_embedding) as similarity
    from ai_chunks c
    where c.community_id = p_community_id
      and c.embedding is not null
    order by c.embedding <=> p_query_embedding
    limit p_match_count;
end;
$$;

-- ============ RLS: AI conversations + messages (scoped to the owning user) ============
alter table ai_conversations enable row level security;
alter table ai_messages      enable row level security;

drop policy if exists "ai_conv_own" on ai_conversations;
create policy "ai_conv_own" on ai_conversations
  for select using (user_id = current_profile_id());

drop policy if exists "ai_conv_insert_own" on ai_conversations;
create policy "ai_conv_insert_own" on ai_conversations
  for insert with check (user_id = current_profile_id());

drop policy if exists "ai_msg_own" on ai_messages;
create policy "ai_msg_own" on ai_messages
  for select using (
    exists (select 1 from ai_conversations c
            where c.id = ai_messages.conversation_id
              and c.user_id = current_profile_id())
  );

drop policy if exists "ai_msg_insert_own" on ai_messages;
create policy "ai_msg_insert_own" on ai_messages
  for insert with check (
    exists (select 1 from ai_conversations c
            where c.id = ai_messages.conversation_id
              and c.user_id = current_profile_id())
  );

-- ============ ai_chunks: no direct client access (retrieval is via the RPC) ============
-- ai_chunks already has RLS enabled (0001) with no policies => locked to clients.
-- The match_ai_chunks RPC (SECURITY DEFINER) is the only read path.
alter table ai_chunks enable row level security;

-- ============ ai_sources: members can see a community's source list; owner manages ============
alter table ai_sources enable row level security;

drop policy if exists "ai_sources_read" on ai_sources;
create policy "ai_sources_read" on ai_sources
  for select using (
    owner_id = current_profile_id()
    or (community_id is not null and is_community_member(community_id))
  );

drop policy if exists "ai_sources_insert_own" on ai_sources;
create policy "ai_sources_insert_own" on ai_sources
  for insert with check (owner_id = current_profile_id());

drop policy if exists "ai_sources_update_own" on ai_sources;
create policy "ai_sources_update_own" on ai_sources
  for update using (owner_id = current_profile_id());
