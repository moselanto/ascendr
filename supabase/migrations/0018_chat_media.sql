-- 0018: Slack-style chat - media attachments and reactions everywhere
--   * direct_messages gains attachments and may have an empty body when a file is sent
--   * dm_reactions: any emoji on a direct message, by either party
--   * chat-media storage bucket: images, videos and files for channels and DMs
-- Idempotent; run after 0017 in the Supabase SQL editor.

alter table direct_messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table direct_messages alter column body drop not null;
alter table channel_messages alter column attachments set default '[]'::jsonb;

create table if not exists dm_reactions (
  message_id uuid not null references direct_messages(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  emoji      text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
alter table dm_reactions enable row level security;

create or replace function is_dm_party(p_message uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from direct_messages d
                 where d.id = p_message
                   and current_profile_id() in (d.sender_id, d.recipient_id));
$$;

drop policy if exists "dm_reactions_read" on dm_reactions;
create policy "dm_reactions_read" on dm_reactions for select using (is_dm_party(message_id));
drop policy if exists "dm_reactions_insert_self" on dm_reactions;
create policy "dm_reactions_insert_self" on dm_reactions for insert
  with check (user_id = current_profile_id() and is_dm_party(message_id));
drop policy if exists "dm_reactions_delete_self" on dm_reactions;
create policy "dm_reactions_delete_self" on dm_reactions for delete using (user_id = current_profile_id());

do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_reactions') then
    alter publication supabase_realtime add table dm_reactions;
  end if;
end $$;

-- Storage: public-read bucket, 25 MB per file. Paths are <auth uid>/<uuid>-<name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', true, 26214400, array[
  'image/jpeg','image/png','image/webp','image/gif',
  'video/mp4','video/webm','video/quicktime',
  'application/pdf','text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat_media_read" on storage.objects;
create policy "chat_media_read" on storage.objects for select using (bucket_id = 'chat-media');
drop policy if exists "chat_media_insert_own" on storage.objects;
create policy "chat_media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "chat_media_delete_own" on storage.objects;
create policy "chat_media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
