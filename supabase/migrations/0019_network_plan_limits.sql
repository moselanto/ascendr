-- 0019: plan limits for ASCENDR Networks
--
-- A network's plan is the best live plan held by any of its admins:
--   platform admin (profiles.role = 'admin')  -> unlimited (pilots, Custom deals)
--   Pro                                        -> 250 members, unlimited roles
--   Starter                                    -> 50 members, 3 roles
--   Free                                       -> 10 members, 1 role (trial)
-- Keep these numbers in sync with NETWORK_LIMITS in src/lib/plans.ts.
--
-- Enforced by BEFORE INSERT triggers, so the limit holds no matter which path
-- writes the row (invite RPC, direct insert under RLS, admin tools).
-- Existing rows are never removed: a network already over its limit keeps
-- everyone, it just can't add more until it upgrades.

create or replace function org_plan(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  with admins as (
    select m.user_id from organization_members m
    where m.organization_id = p_org and m.role = 'admin'
  ), live as (
    select s.plan from subscriptions s join admins a on a.user_id = s.user_id
    where s.status in ('active','non_renewing','past_due')
      and (s.current_period_end is null or s.current_period_end > now())
  )
  select case
    when exists (select 1 from profiles p join admins a on a.user_id = p.id where p.role = 'admin') then 'unlimited'
    when exists (select 1 from live where plan = 'pro') then 'pro'
    when exists (select 1 from live where plan = 'starter') then 'starter'
    else 'free'
  end;
$$;

create or replace function org_limits(p_org uuid)
returns table (plan text, max_members int, max_roles int, members int, roles int)
language plpgsql stable security definer set search_path = public as $$
declare v_plan text;
begin
  if not is_org_member(p_org) then return; end if;
  v_plan := org_plan(p_org);
  return query select
    v_plan,
    case v_plan when 'free' then 10 when 'starter' then 50 when 'pro' then 250 else null end,
    case v_plan when 'free' then 1 when 'starter' then 3 else null end,
    (select count(*)::int from organization_members where organization_id = p_org),
    (select count(*)::int from organization_roles where organization_id = p_org);
end $$;

create or replace function enforce_org_member_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_plan text; v_max int; v_count int;
begin
  -- Re-joining (on conflict do nothing) must not be blocked.
  if exists (select 1 from organization_members where organization_id = new.organization_id and user_id = new.user_id) then
    return new;
  end if;
  v_plan := org_plan(new.organization_id);
  v_max := case v_plan when 'free' then 10 when 'starter' then 50 when 'pro' then 250 else null end;
  if v_max is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext('org_members:' || new.organization_id::text));
  select count(*) into v_count from organization_members where organization_id = new.organization_id;
  if v_count >= v_max then
    raise exception 'plan_limit_members' using hint = v_plan || ':' || v_max;
  end if;
  return new;
end $$;

drop trigger if exists organization_members_limit on organization_members;
create trigger organization_members_limit before insert on organization_members
  for each row execute function enforce_org_member_limit();

create or replace function enforce_org_role_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_plan text; v_max int; v_count int;
begin
  v_plan := org_plan(new.organization_id);
  v_max := case v_plan when 'free' then 1 when 'starter' then 3 else null end;
  if v_max is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext('org_roles:' || new.organization_id::text));
  select count(*) into v_count from organization_roles where organization_id = new.organization_id;
  if v_count >= v_max then
    raise exception 'plan_limit_roles' using hint = v_plan || ':' || v_max;
  end if;
  return new;
end $$;

drop trigger if exists organization_roles_limit on organization_roles;
create trigger organization_roles_limit before insert on organization_roles
  for each row execute function enforce_org_role_limit();

grant execute on function org_limits(uuid) to authenticated;
