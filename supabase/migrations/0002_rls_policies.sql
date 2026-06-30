-- ASCENDR — Phase 1 RLS policies
-- Source of truth: ASCENDR Master PRD, Section 13.2 + 14.9 (membership-scoped RLS).
-- Run AFTER 0001_phase1_foundation.sql. Makes the locked-down tables usable by the app
-- while enforcing the PRD's access model. Central SECURITY DEFINER helpers avoid policy drift.
--
-- Model:
--   * profiles map to auth.users via profiles.auth_user_id = auth.uid()
--   * helper current_profile_id() resolves the caller's profile id
--   * is_community_member / is_community_mod gate all community-scoped data

-- ============ Helper functions (SECURITY DEFINER) ============
create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function is_community_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from community_members cm
    where cm.community_id = cid
      and cm.user_id = current_profile_id()
      and cm.status = 'active'
  );
$$;

create or replace function is_community_mod(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from community_members cm
    where cm.community_id = cid
      and cm.user_id = current_profile_id()
      and cm.role in ('owner','moderator')
      and cm.status = 'active'
  );
$$;

-- ============ Profiles ============
-- Anyone authenticated can read profiles (public directory); you can only edit your own.
create policy "profiles_read_all" on profiles
  for select using (auth.uid() is not null);
create policy "profiles_insert_self" on profiles
  for insert with check (auth_user_id = auth.uid());
create policy "profiles_update_self" on profiles
  for update using (auth_user_id = auth.uid());

-- ============ Communities ============
-- Public communities are readable by anyone authenticated; private/paid only by members.
create policy "communities_read" on communities
  for select using (
    visibility = 'public'
    or owner_id = current_profile_id()
    or is_community_member(id)
  );
create policy "communities_insert_owner" on communities
  for insert with check (owner_id = current_profile_id());
create policy "communities_update_owner" on communities
  for update using (owner_id = current_profile_id());

-- ============ Community members ============
create policy "members_read" on community_members
  for select using (is_community_member(community_id) or is_community_mod(community_id));
-- A user can join (insert their own active membership); mods manage others.
create policy "members_join_self" on community_members
  for insert with check (user_id = current_profile_id());
create policy "members_manage_mod" on community_members
  for update using (is_community_mod(community_id));
create policy "members_leave_self" on community_members
  for delete using (user_id = current_profile_id() or is_community_mod(community_id));

-- ============ Community channels ============
create policy "channels_read" on community_channels
  for select using (is_community_member(community_id));
create policy "channels_manage_mod" on community_channels
  for all using (is_community_mod(community_id))
  with check (is_community_mod(community_id));

-- ============ Channel messages ============
create policy "messages_read" on channel_messages
  for select using (
    is_community_member((select community_id from community_channels c where c.id = channel_id))
  );
create policy "messages_write" on channel_messages
  for insert with check (
    author_id = current_profile_id()
    and is_community_member((select community_id from community_channels c where c.id = channel_id))
  );
create policy "messages_edit_own" on channel_messages
  for update using (author_id = current_profile_id());
create policy "messages_delete_own_or_mod" on channel_messages
  for delete using (
    author_id = current_profile_id()
    or is_community_mod((select community_id from community_channels c where c.id = channel_id))
  );

-- ============ Feed posts ============
-- Posts in a community require membership; global posts (community_id null) readable by all authed.
create policy "feed_read" on feed_posts
  for select using (
    community_id is null
    or is_community_member(community_id)
  );
create policy "feed_write" on feed_posts
  for insert with check (
    author_id = current_profile_id()
    and (community_id is null or is_community_member(community_id))
  );
create policy "feed_edit_own" on feed_posts
  for update using (author_id = current_profile_id());
create policy "feed_delete_own" on feed_posts
  for delete using (author_id = current_profile_id());

-- ============ Notifications ============
-- Strictly private to the recipient.
create policy "notifications_read_own" on notifications
  for select using (user_id = current_profile_id());
create policy "notifications_update_own" on notifications
  for update using (user_id = current_profile_id());

-- ============ XP events ============
-- Readable by the user (own) or fellow community members (for leaderboards).
create policy "xp_read" on xp_events
  for select using (
    user_id = current_profile_id()
    or (community_id is not null and is_community_member(community_id))
  );
-- XP is awarded server-side (service role bypasses RLS); no client insert policy on purpose.

-- ============ Live sessions ============
create policy "live_read" on live_sessions
  for select using (is_community_member(community_id));
create policy "live_manage_mod" on live_sessions
  for all using (is_community_mod(community_id))
  with check (is_community_mod(community_id));

-- ============ AI sources ============
-- An expert sees their own sources; community members see sources scoped to their community.
create policy "ai_sources_read" on ai_sources
  for select using (
    owner_id = current_profile_id()
    or (community_id is not null and is_community_member(community_id))
  );
create policy "ai_sources_manage_own" on ai_sources
  for all using (owner_id = current_profile_id())
  with check (owner_id = current_profile_id());

-- NOTE: ai_chunks is intentionally NOT exposed to clients. Retrieval (vector search)
-- runs server-side via the service role, which bypasses RLS. Keeping no client policy
-- enforces per-mentor source isolation per the PRD's AI safeguards (Section 16.4).
