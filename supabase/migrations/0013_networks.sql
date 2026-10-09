-- 0013: ASCENDR Networks - organisations, invites, open roles, and
-- admin-only aggregate views (readiness map, skill supply, overview).
-- Idempotent; run after 0012 in the Supabase SQL editor.
--
-- Privacy model:
--   * A member's career data is visible to an organisation's admins only
--     while organization_members.share_career_data is true (default on,
--     member can switch it off at any time from /app/network).
--   * Admins never read member rows directly: they call the SECURITY
--     DEFINER functions below, each of which checks is_org_admin() first.

create table if not exists organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null check (char_length(name) between 2 and 120),
  kind        text not null default 'other'
                check (kind in ('vc_fund','accelerator','university','association','company','other')),
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id    uuid not null references organizations(id) on delete cascade,
  user_id            uuid not null references profiles(id) on delete cascade,
  role               text not null default 'member' check (role in ('admin','member')),
  share_career_data  boolean not null default true,
  joined_at          timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists organization_members_user_idx on organization_members (user_id);

create table if not exists organization_invites (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  code             text not null unique default replace(gen_random_uuid()::text, '-', ''),
  label            text,
  created_by       uuid references profiles(id) on delete set null,
  expires_at       timestamptz not null default now() + interval '30 days',
  uses             int not null default 0,
  max_uses         int not null default 500,
  created_at       timestamptz not null default now()
);

create table if not exists organization_roles (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  role_profile_id  uuid not null references role_profiles(id) on delete cascade,
  company          text not null check (char_length(company) between 1 and 120),
  openings         int not null default 1 check (openings between 1 and 500),
  created_at       timestamptz not null default now()
);
create index if not exists organization_roles_org_idx on organization_roles (organization_id);

-- ---------------------------------------------------------------- helpers
create or replace function is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members
                 where organization_id = org and user_id = current_profile_id());
$$;

create or replace function is_org_admin(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members
                 where organization_id = org and user_id = current_profile_id() and role = 'admin');
$$;

-- ---------------------------------------------------------------- RLS
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_invites enable row level security;
alter table organization_roles enable row level security;

drop policy if exists "org_select_members" on organizations;
create policy "org_select_members" on organizations for select using (is_org_member(id));
drop policy if exists "org_update_admins" on organizations;
create policy "org_update_admins" on organizations for update using (is_org_admin(id)) with check (is_org_admin(id));

drop policy if exists "orgmem_select" on organization_members;
create policy "orgmem_select" on organization_members for select using (is_org_member(organization_id));
drop policy if exists "orgmem_delete" on organization_members;
create policy "orgmem_delete" on organization_members for delete
  using (user_id = current_profile_id() or is_org_admin(organization_id));

drop policy if exists "orginv_admin" on organization_invites;
create policy "orginv_admin" on organization_invites for all
  using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));

drop policy if exists "orgrole_select" on organization_roles;
create policy "orgrole_select" on organization_roles for select using (is_org_member(organization_id));
drop policy if exists "orgrole_insert" on organization_roles;
create policy "orgrole_insert" on organization_roles for insert with check (is_org_admin(organization_id));
drop policy if exists "orgrole_delete" on organization_roles;
create policy "orgrole_delete" on organization_roles for delete using (is_org_admin(organization_id));

-- ---------------------------------------------------------------- write functions
create or replace function create_organization(p_name text, p_kind text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_me uuid := current_profile_id();
begin
  if v_me is null then raise exception 'not signed in'; end if;
  insert into organizations (name, kind, created_by)
  values (trim(p_name), coalesce(nullif(p_kind, ''), 'other'), v_me)
  returning id into v_id;
  insert into organization_members (organization_id, user_id, role) values (v_id, v_me, 'admin');
  return v_id;
end $$;

create or replace function org_invite_preview(p_code text)
returns table (organization_id uuid, organization_name text, kind text, valid boolean)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.kind, (i.expires_at > now() and i.uses < i.max_uses)
  from organization_invites i join organizations o on o.id = i.organization_id
  where i.code = p_code;
$$;

create or replace function accept_org_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_inv organization_invites%rowtype; v_me uuid := current_profile_id();
begin
  if v_me is null then raise exception 'not signed in'; end if;
  select * into v_inv from organization_invites where code = p_code;
  if not found or v_inv.expires_at < now() or v_inv.uses >= v_inv.max_uses then
    raise exception 'invite invalid or expired';
  end if;
  insert into organization_members (organization_id, user_id, role)
  values (v_inv.organization_id, v_me, 'member')
  on conflict (organization_id, user_id) do nothing;
  update organization_invites set uses = uses + 1 where id = v_inv.id;
  return v_inv.organization_id;
end $$;

create or replace function set_org_sharing(p_org uuid, p_share boolean) returns void
language sql security definer set search_path = public as $$
  update organization_members set share_career_data = p_share
  where organization_id = p_org and user_id = current_profile_id();
$$;

-- ---------------------------------------------------------------- admin read functions
create or replace function org_overview(p_org uuid)
returns table (members int, sharing int, activated int, acted_7d int,
               outcomes_90d int, interviews_90d int, hires_90d int, intros_90d int)
language sql stable security definer set search_path = public as $$
  with m as (
    select user_id, share_career_data from organization_members
    where organization_id = p_org and is_org_admin(p_org)
  ), s as (select user_id from m where share_career_data),
  o as (
    select kind from career_outcomes
    where user_id in (select user_id from s) and occurred_on >= current_date - 90
  )
  select
    (select count(*) from m)::int,
    (select count(*) from s)::int,
    (select count(distinct g.user_id) from career_goals g
       where g.status = 'active' and g.user_id in (select user_id from s))::int,
    (select count(distinct a.user_id) from career_actions a
       where a.status = 'completed' and a.completed_at >= now() - interval '7 days'
         and a.user_id in (select user_id from s))::int,
    (select count(*) from o)::int,
    (select count(*) from o where kind = 'interview')::int,
    (select count(*) from o where kind in ('offer','job_started'))::int,
    (select count(*) from o where kind = 'introduction_made')::int
  where is_org_admin(p_org);
$$;

create or replace function org_members_list(p_org uuid)
returns table (user_id uuid, full_name text, role text, share_career_data boolean,
               joined_at timestamptz, goal_title text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, m.role, m.share_career_data, m.joined_at,
         case when m.share_career_data then (
           select coalesce(rp.title, g.target_title) from career_goals g
           left join role_profiles rp on rp.id = g.target_role_id
           where g.user_id = m.user_id and g.status = 'active'
           order by g.created_at desc limit 1)
         end
  from organization_members m join profiles p on p.id = m.user_id
  where m.organization_id = p_org and is_org_admin(p_org)
  order by m.joined_at desc;
$$;

create or replace function org_readiness(p_org uuid)
returns table (org_role_id uuid, role_title text, company text, openings int,
               member_id uuid, member_name text, band text, matched int, essential int,
               missing text[], goal_match boolean)
language sql stable security definer set search_path = public as $$
  with roles as (
    select r.id as org_role_id, rp.id as role_id, rp.title, r.company, r.openings
    from organization_roles r join role_profiles rp on rp.id = r.role_profile_id
    where r.organization_id = p_org and is_org_admin(p_org)
  ), mem as (
    select m.user_id, p.full_name
    from organization_members m join profiles p on p.id = m.user_id
    where m.organization_id = p_org and m.share_career_data and is_org_admin(p_org)
  ), req as (
    select rr.role_id, rr.skill_id, coalesce(rr.weight, 0.5) as weight, s.preferred_label
    from role_required_skills rr join skills s on s.id = rr.skill_id
    where rr.importance = 'essential' and rr.role_id in (select role_id from roles)
  ), calc as (
    select ro.org_role_id, ro.role_id, ro.title, ro.company, ro.openings, mb.user_id, mb.full_name,
      coalesce(sum(rq.weight) filter (where us.skill_id is not null), 0)::numeric as covered_w,
      coalesce(sum(rq.weight), 0)::numeric as total_w,
      count(us.skill_id) as matched,
      count(rq.skill_id) as essential,
      array_remove(array_agg(case when us.skill_id is null then rq.preferred_label end
                             order by rq.weight desc), null) as missing
    from roles ro cross join mem mb
    left join req rq on rq.role_id = ro.role_id
    left join user_skills us on us.user_id = mb.user_id and us.skill_id = rq.skill_id
    group by ro.org_role_id, ro.role_id, ro.title, ro.company, ro.openings, mb.user_id, mb.full_name
  )
  select c.org_role_id, c.title, c.company, c.openings, c.user_id, c.full_name,
    case when c.total_w = 0 then 'unknown'
         when c.covered_w / c.total_w >= 0.75 then 'strong'
         when c.covered_w / c.total_w >= 0.4 then 'partial'
         else 'stretch' end,
    c.matched::int, c.essential::int, c.missing,
    exists (select 1 from career_goals g where g.user_id = c.user_id
            and g.status = 'active' and g.target_role_id = c.role_id)
  from calc c;
$$;

create or replace function org_skill_supply(p_org uuid)
returns table (skill_id uuid, skill text, demand int, have int, learning int)
language sql stable security definer set search_path = public as $$
  with mem as (
    select user_id from organization_members
    where organization_id = p_org and share_career_data and is_org_admin(p_org)
  ), dem as (
    select rr.skill_id, sum(r.openings)::int as demand
    from organization_roles r
    join role_required_skills rr on rr.role_id = r.role_profile_id and rr.importance = 'essential'
    where r.organization_id = p_org and is_org_admin(p_org)
    group by rr.skill_id
  )
  select d.skill_id, s.preferred_label, d.demand,
    (select count(*) from user_skills us
      where us.skill_id = d.skill_id and us.user_id in (select user_id from mem))::int,
    (select count(distinct a.user_id) from career_actions a
      where a.skill_id = d.skill_id and a.related_type = 'plan_step'
        and a.user_id in (select user_id from mem)
        and not exists (select 1 from user_skills u2 where u2.user_id = a.user_id and u2.skill_id = d.skill_id))::int
  from dem d join skills s on s.id = d.skill_id
  order by d.demand desc, s.preferred_label
  limit 12;
$$;
