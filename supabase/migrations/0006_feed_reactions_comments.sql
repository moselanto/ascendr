-- ASCENDR — 0006: Feed reactions + comments RLS
-- feed_posts already has policies (0002). post_reactions + post_comments were
-- created in 0001 but never had RLS enabled or policies. This adds them.
-- Idempotent + safe to re-run.

-- ============ post_reactions ============
alter table post_reactions enable row level security;

-- Read a reaction if you can read its post (community member, or global post).
drop policy if exists "post_reactions_read" on post_reactions;
create policy "post_reactions_read" on post_reactions
  for select using (
    exists (select 1 from feed_posts p
            where p.id = post_reactions.post_id
              and (p.community_id is null or is_community_member(p.community_id)))
  );

drop policy if exists "post_reactions_insert_own" on post_reactions;
create policy "post_reactions_insert_own" on post_reactions
  for insert with check (
    user_id = current_profile_id()
    and exists (select 1 from feed_posts p
                where p.id = post_reactions.post_id
                  and (p.community_id is null or is_community_member(p.community_id)))
  );

drop policy if exists "post_reactions_delete_own" on post_reactions;
create policy "post_reactions_delete_own" on post_reactions
  for delete using (user_id = current_profile_id());

-- ============ post_comments ============
alter table post_comments enable row level security;

drop policy if exists "post_comments_read" on post_comments;
create policy "post_comments_read" on post_comments
  for select using (
    exists (select 1 from feed_posts p
            where p.id = post_comments.post_id
              and (p.community_id is null or is_community_member(p.community_id)))
  );

drop policy if exists "post_comments_insert_own" on post_comments;
create policy "post_comments_insert_own" on post_comments
  for insert with check (
    author_id = current_profile_id()
    and exists (select 1 from feed_posts p
                where p.id = post_comments.post_id
                  and (p.community_id is null or is_community_member(p.community_id)))
  );

drop policy if exists "post_comments_delete_own" on post_comments;
create policy "post_comments_delete_own" on post_comments
  for delete using (author_id = current_profile_id());

-- ============ Realtime for the feed ============
alter publication supabase_realtime add table feed_posts;
alter publication supabase_realtime add table post_reactions;
alter publication supabase_realtime add table post_comments;
