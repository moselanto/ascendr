-- 0029: keep communities.member_count in step with community_members
--
-- member_count was bumped by hand in the join/leave server actions. Those
-- updates run as the member, and RLS only lets owners/mods update a
-- community, so ordinary joins and leaves were silently dropped. Leadership
-- Lab showed "1 members" while its Members tab listed 2 people.
--
-- A trigger now recounts active members whenever a membership is added,
-- removed or changes status, and every existing community is resynced once.

create or replace function sync_community_member_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
begin
  for cid in
    select distinct x from unnest(array[
      case when tg_op in ('INSERT','UPDATE') then new.community_id end,
      case when tg_op in ('UPDATE','DELETE') then old.community_id end
    ]) as x where x is not null
  loop
    update communities c
       set member_count = (
         select count(*) from community_members m
          where m.community_id = cid and m.status = 'active')
     where c.id = cid;
  end loop;
  return null;
end;
$$;

drop trigger if exists community_members_count_sync on community_members;
create trigger community_members_count_sync
  after insert or update of status, community_id or delete on community_members
  for each row execute function sync_community_member_count();

-- One-time resync of every community.
update communities c
   set member_count = (
     select count(*) from community_members m
      where m.community_id = c.id and m.status = 'active');
