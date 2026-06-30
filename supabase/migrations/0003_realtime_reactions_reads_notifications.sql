-- ASCENDR — 0003: RLS for reactions, channel reads, notification inserts + Realtime publication
-- Run AFTER 0001 and 0002. Enables the realtime chat, reactions, unread badges, and bell.

-- ============ Enable RLS on the remaining interactive tables ============
alter table message_reactions enable row level security;
alter table channel_reads     enable row level security;

-- ============ Message reactions ============
-- A member of the message's community can read reactions on that message.
create policy "reactions_read" on message_reactions
  for select using (
    is_community_member((
      select c.community_id
      from channel_messages m
      join community_channels c on c.id = m.channel_id
      where m.id = message_reactions.message_id
    ))
  );
-- You can only add/remove your own reactions, and only as a member.
create policy "reactions_insert_self" on message_reactions
  for insert with check (
    user_id = current_profile_id()
    and is_community_member((
      select c.community_id
      from channel_messages m
      join community_channels c on c.id = m.channel_id
      where m.id = message_reactions.message_id
    ))
  );
create policy "reactions_delete_self" on message_reactions
  for delete using (user_id = current_profile_id());

-- ============ Channel reads (unread badges) ============
create policy "reads_own" on channel_reads
  for select using (user_id = current_profile_id());
create policy "reads_upsert_self" on channel_reads
  for insert with check (user_id = current_profile_id());
create policy "reads_update_self" on channel_reads
  for update using (user_id = current_profile_id());

-- ============ Notifications: allow members to create them for others ============
-- (0002 only covered read/update of own notifications; inserts were blocked.)
-- An authenticated user may create a notification addressed to another user
-- (e.g. "X posted in your community"). Spam is bounded by app logic + rate limits.
create policy "notifications_insert_authed" on notifications
  for insert with check (auth.uid() is not null);

-- ============ Realtime publication ============
-- Tell Supabase Realtime to broadcast row changes for these tables so the
-- client subscriptions in ChannelChat / NotificationBell receive live updates.
alter publication supabase_realtime add table channel_messages;
alter publication supabase_realtime add table message_reactions;
alter publication supabase_realtime add table notifications;
