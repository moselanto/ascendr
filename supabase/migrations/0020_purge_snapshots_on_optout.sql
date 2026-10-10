-- 0020: purge a member's readiness history when they stop sharing or leave
--
-- org_readiness_snapshots (0016) keeps one row per role/member/day so a
-- network can see readiness change over time. Until now a member who turned
-- sharing off, or left the network, stayed in that history. This trigger
-- deletes their snapshots for that network the moment either happens, so
-- turning sharing off hides their career data straight away.
--
-- Kept on purpose: pathway invites and introductions (0016). They are the
-- member's own consent record and the network's hire record.
-- A member who turns sharing back on starts a fresh history from that day.

create or replace function purge_org_member_snapshots() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from org_readiness_snapshots
     where organization_id = old.organization_id and member_id = old.user_id;
    return old;
  end if;
  if old.share_career_data = true and new.share_career_data = false then
    delete from org_readiness_snapshots
     where organization_id = new.organization_id and member_id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists organization_members_purge_snapshots on organization_members;
create trigger organization_members_purge_snapshots
  after update of share_career_data or delete on organization_members
  for each row execute function purge_org_member_snapshots();

-- One-off cleanup: remove history already held for members who are no
-- longer sharing, or who have left the network.
delete from org_readiness_snapshots s
 where not exists (
   select 1 from organization_members m
    where m.organization_id = s.organization_id
      and m.user_id = s.member_id
      and m.share_career_data = true
 );
