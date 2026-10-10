-- 0025: mentor source ingestion in small batches (SECURITY-AUDIT H-1)
--
-- Before: chunking, embedding and inserting a whole source happened inside
-- one request, which times out on large files and left sources stuck at
-- 'processing' with half their chunks saved.
-- Now: the upload saves every chunk without an embedding straight away, and
-- embeddings are filled in batch by batch (/api/ai/mentor/ingest/process).
-- Progress is tracked here, a failure is recorded with its reason, and an
-- unfinished or failed source can be resumed from where it stopped.

alter table ai_sources drop constraint if exists ai_sources_status_check;
alter table ai_sources add constraint ai_sources_status_check
  check (status in ('processing','ready','failed'));

alter table ai_sources add column if not exists total_chunks int not null default 0;
alter table ai_sources add column if not exists done_chunks  int not null default 0;
alter table ai_sources add column if not exists error        text;
alter table ai_sources add column if not exists updated_at   timestamptz not null default now();

create index if not exists ai_chunks_pending_idx on ai_chunks (source_id, chunk_index) where embedding is null;
