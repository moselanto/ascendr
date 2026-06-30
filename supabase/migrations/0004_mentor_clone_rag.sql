-- ASCENDR — 0004: Mentor Clone (RAG) support
-- Adds source text + chunk metadata, a vector-search RPC, AI conversation storage,
-- and RLS. Run AFTER 0001-0003. Requires the `vector` extension (already enabled in 0001).

-- ---- ai_sources: keep the original text + a title for citations ----
alter table ai_sources add column if not exists title text;
alter table ai_sources add column if not exists content text;

-- ---- ai_chunks: store which source/community + a position for citation labels ----
alter table ai_chunks add column if not exists community_id uuid references communities(id) on delete cascade;
alter table ai_chunks add column if not exists owner_id uuid references profiles(id);
alter table ai_chunks add column if not exists source_title text;
alter table ai_chunks add column if not exists chunk_index integer default 0;

-- Index for fast vector similarity search (cosine).
create index if not exists ai_chunks_embedding_idx
  on ai_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---- Vector search RPC: returns top-k chunks for a community, scoped + safe ----
-- Runs as SECURITY DEFINER so retrieval happens server-side (per PRD AI isolation),
-- but it is gated to communities the caller is a member of.
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

-- ---- AI conversations + messages (history per user/scope) ----
-- Tables exist from 0001 (ai_conversations, ai_messages). Enable + scope RLS here.
alter table ai_conversations enable row level security;
alter table ai_messages      enable row level security;

create policy "ai_conv_own" on ai_conversations
  for select using (user_id = current_profile_id());
create policy "ai_conv_insert_own" on ai_conversations
  for insert with check (user_id = current_profile_id());

create policy "ai_msg_own" on ai_messages
  for select using (
    exists (select 1 from ai_conversations c
            where c.id = ai_messages.conversation_id
              and c.user_id = current_profile_id())
  );
create policy "ai_msg_insert_own" on ai_messages
  for insert with check (
    exists (select 1 from ai_conversations c
            where c.id = ai_messages.conversation_id
              and c.user_id = current_profile_id())
  );

-- ---- ai_chunks: no direct client access (retrieval is via the RPC / service role) ----
-- ai_chunks already has RLS enabled (0001) with no policies => locked to clients.
-- The match_ai_chunks RPC (SECURITY DEFINER) is the only read path. Good.

-- ---- ai_sources: members can see a community's source list; owner manages ----
-- (0002 added basic ai_sources policies; ensure community members can read titles.)
drop policy if exists "ai_sources_read" on ai_sources;
create policy "ai_sources_read" on ai_sources
  for select using (
    owner_id = current_profile_id()
    or (community_id is not null and is_community_member(community_id))
  );
