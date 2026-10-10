-- 0030: let members delete direct messages they sent
--
-- direct_messages had read, insert and "mark read" policies but no delete
-- policy, so a sent message could never be removed. The sender (only) may
-- now delete their own messages. Reactions on a deleted message go with it
-- where the reaction table references direct_messages with on delete cascade.

drop policy if exists "dm_delete_own" on direct_messages;
create policy "dm_delete_own" on direct_messages
  for delete using (sender_id = current_profile_id());
