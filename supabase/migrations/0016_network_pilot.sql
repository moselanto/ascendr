-- 0016: pilot workflow for networks
--   1. Readiness over time: daily snapshots of each sharing member's band per
--      open role, a trend, and "moved up a band" list.
--   2. Organisation-led development: an admin invites a member to work toward
--      a role; accepting makes it the member's active goal.
--   3. Consent-gated introductions: admin proposes, the member consents, then
--      the admin records introduced -> interviewing -> hired. Each confirmed
--      step is written to career_outcomes as partner_confirmed.
-- Idempotent; run after 0015 in the Supabase SQL editor.

-- ---------------------------------------------------------------- tables
create table if not exists org_readiness_snapshots (
  organization_id uuid not null references organizations(id) on delete cascade,
  org_role_id     uuid not null references organization_roles(id) on delete cascade,
  member_id       uuid not null references profiles(id) on delete cascade,
  band            text not null,
  matched         int  not null default 0,
  essential       int  not null default 0,
  captured_on     date not null default current_date,
  primary key (org_role_id, member_id, captured_on)
);
create index if not exists org_snap_org_idx on org_readiness_snapshots (organization_id, captured_on);

create table if not exists org_pathway_invites (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  org_role_id     uuid not null references organization_roles(id) on delete cascade,
  member_id       uuid not null references profiles(id) on delete cascade,
  status          text not null default 'invited' check (status in ('invited','accepted','declined')),
  note            text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  unique (org_role_id, member_id)
);

create table if not exists org_introductions (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  org_role_id     uuid not null references organization_roles(id) on delete cascade,
  member_id       uuid not null references profiles(id) on delete cascade,
  status          text not null default 'proposed'
                    check (status in ('proposed','consented','declined','introduced','interviewing','hired','closed')),
  note            text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists org_intro_open_idx on org_introductions (org_role_id, member_id)
  where status in ('proposed','consented','introduced','interviewing');

alter table org_readiness_snapshots enable row level security;
alter table org_pathway_invites enable row level security;
alter table org_introductions enable row level security;

drop policy if exists "pathway_select" on org_pathway_invites;
create policy "pathway_select" on org_pathway_invites for select
  using (member_id = current_profile_id() or is_org_admin(organization_id));
drop policy if exists "intro_select" on org_introductions;
create policy "intro_select" on org_introductions for select
  using (member_id = current_profile_id() or is_org_admin(organization_id));
-- No insert/update policies: all writes go through the functions below.

-- ---------------------------------------------------------------- readiness over time
create or replace function capture_org_readiness(p_org uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_org_admin(p_org) then return 0; end if;
  insert into org_readiness_snapshots (organization_id, org_role_id, member_id, band, matched, essential, captured_on)
  select p_org, r.org_role_id, r.member_id, r.band, r.matched, r.essential, current_date
  from org_readiness(p_org) r
  where r.band <> 'unknown'
  on conflict (org_role_id, member_id, captured_on)
  do update set band = excluded.band, matched = excluded.matched, essential = excluded.essential;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function org_readiness_trend(p_org uuid)
returns table (captured_on date, strong int, partial int, stretch int)
language sql stable security definer set search_path = public as $$
  select s.captured_on,
    count(*) filter (where s.band = 'strong')::int,
    count(*) filter (where s.band = 'partial')::int,
    count(*) filter (where s.band = 'stretch')::int
  from org_readiness_snapshots s
  where s.organization_id = p_org and is_org_admin(p_org) and s.captured_on >= current_date - 120
  group by s.captured_on
  order by s.captured_on;
$$;

create or replace function org_readiness_movers(p_org uuid)
returns table (member_id uuid, member_name text, role_title text, company text,
               from_band text, to_band text, first_on date, last_on date)
language sql stable security definer set search_path = public as $$
  with s as (
    select sn.org_role_id, sn.member_id, sn.band, sn.captured_on,
      case sn.band when 'strong' then 3 when 'partial' then 2 when 'stretch' then 1 else 0 end as rk
    from org_readiness_snapshots sn
    where sn.organization_id = p_org and is_org_admin(p_org) and sn.captured_on >= current_date - 90
  ), f as (
    select distinct on (org_role_id, member_id) org_role_id, member_id, band, rk, captured_on
    from s order by org_role_id, member_id, captured_on asc
  ), l as (
    select distinct on (org_role_id, member_id) org_role_id, member_id, band, rk, captured_on
    from s order by org_role_id, member_id, captured_on desc
  )
  select l.member_id, p.full_name, rp.title, r.company, f.band, l.band, f.captured_on, l.captured_on
  from f
  join l on l.org_role_id = f.org_role_id and l.member_id = f.member_id
  join profiles p on p.id = l.member_id
  join organization_roles r on r.id = l.org_role_id
  join role_profiles rp on rp.id = r.role_profile_id
  where l.rk > f.rk
  order by (l.rk - f.rk) desc, p.full_name;
$$;

-- ---------------------------------------------------------------- helpers
create or replace function org_role_context(p_role uuid)
returns table (organization_id uuid, org_name text, role_profile_id uuid, title text, company text)
language sql stable security definer set search_path = public as $$
  select r.organization_id, o.name, rp.id, rp.title, r.company
  from organization_roles r
  join organizations o on o.id = r.organization_id
  join role_profiles rp on rp.id = r.role_profile_id
  where r.id = p_role;
$$;

-- ---------------------------------------------------------------- development pathways
create or replace function org_invite_pathway(p_role uuid, p_member uuid, p_note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from org_role_context(p_role);
  if c.organization_id is null or not is_org_admin(c.organization_id) then return 'not_allowed'; end if;
  if not exists (select 1 from organization_members m where m.organization_id = c.organization_id
                 and m.user_id = p_member and m.share_career_data) then return 'not_sharing'; end if;
  insert into org_pathway_invites (organization_id, org_role_id, member_id, note, created_by)
  values (c.organization_id, p_role, p_member, nullif(left(p_note, 500), ''), current_profile_id())
  on conflict (org_role_id, member_id) do update
    set status = 'invited', note = excluded.note, created_at = now(), responded_at = null,
        created_by = excluded.created_by
    where org_pathway_invites.status <> 'accepted';
  insert into notifications (user_id, type, actor_id, entity_type, entity_id, body)
  values (p_member, 'pathway_invite', current_profile_id(), 'organization', c.organization_id,
          c.org_name || ' invited you to work toward ' || c.title || ' at ' || c.company);
  return 'ok';
end $$;

create or replace function respond_pathway(p_id uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare v org_pathway_invites%rowtype; c record; me uuid := current_profile_id();
begin
  select * into v from org_pathway_invites where id = p_id and member_id = me and status = 'invited';
  if v.id is null then return 'not_found'; end if;
  update org_pathway_invites set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now() where id = p_id;
  select * into c from org_role_context(v.org_role_id);
  if p_accept then
    update career_goals set status = 'paused' where user_id = me and status = 'active';
    insert into career_goals (user_id, kind, target_role_id, target_title, status)
    values (me, 'switch', c.role_profile_id, c.title, 'active');
  end if;
  if v.created_by is not null then
    insert into notifications (user_id, type, actor_id, entity_type, entity_id, body)
    values (v.created_by, 'pathway_response', me, 'organization', v.organization_id,
            coalesce((select full_name from profiles where id = me), 'A member') ||
            case when p_accept then ' accepted the pathway to ' else ' declined the pathway to ' end || c.title);
  end if;
  return 'ok';
end $$;

-- ---------------------------------------------------------------- introductions
create or replace function org_propose_intro(p_role uuid, p_member uuid, p_note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from org_role_context(p_role);
  if c.organization_id is null or not is_org_admin(c.organization_id) then return 'not_allowed'; end if;
  if not exists (select 1 from organization_members m where m.organization_id = c.organization_id
                 and m.user_id = p_member and m.share_career_data) then return 'not_sharing'; end if;
  if exists (select 1 from org_introductions where org_role_id = p_role and member_id = p_member
             and status in ('proposed','consented','introduced','interviewing')) then return 'exists'; end if;
  insert into org_introductions (organization_id, org_role_id, member_id, note, created_by)
  values (c.organization_id, p_role, p_member, nullif(left(p_note, 500), ''), current_profile_id());
  insert into notifications (user_id, type, actor_id, entity_type, entity_id, body)
  values (p_member, 'intro_request', current_profile_id(), 'organization', c.organization_id,
          c.org_name || ' would like to introduce you to ' || c.company || ' for ' || c.title || '. Your consent is needed.');
  return 'ok';
end $$;

create or replace function respond_intro(p_id uuid, p_consent boolean) returns text
language plpgsql security definer set search_path = public as $$
declare v org_introductions%rowtype; c record; me uuid := current_profile_id();
begin
  select * into v from org_introductions where id = p_id and member_id = me and status = 'proposed';
  if v.id is null then return 'not_found'; end if;
  update org_introductions set status = case when p_consent then 'consented' else 'declined' end,
         updated_at = now() where id = p_id;
  select * into c from org_role_context(v.org_role_id);
  if v.created_by is not null then
    insert into notifications (user_id, type, actor_id, entity_type, entity_id, body)
    values (v.created_by, 'intro_response', me, 'organization', v.organization_id,
            coalesce((select full_name from profiles where id = me), 'A member') ||
            case when p_consent then ' consented to an introduction to ' else ' declined an introduction to ' end ||
            c.company || ' (' || c.title || ')');
  end if;
  return 'ok';
end $$;

create or replace function org_advance_intro(p_id uuid, p_status text) returns text
language plpgsql security definer set search_path = public as $$
declare v org_introductions%rowtype; c record; v_kind text;
begin
  select * into v from org_introductions where id = p_id;
  if v.id is null or not is_org_admin(v.organization_id) then return 'not_allowed'; end if;
  if not (
       (v.status = 'consented'    and p_status = 'introduced')
    or (v.status = 'introduced'   and p_status = 'interviewing')
    or (v.status = 'interviewing' and p_status = 'hired')
    or (p_status = 'closed' and v.status in ('proposed','consented','introduced','interviewing'))
  ) then return 'invalid'; end if;
  update org_introductions set status = p_status, updated_at = now() where id = p_id;
  select * into c from org_role_context(v.org_role_id);
  v_kind := case p_status when 'introduced' then 'introduction_made'
                          when 'interviewing' then 'interview'
                          when 'hired' then 'job_started' else null end;
  if v_kind is not null then
    insert into career_outcomes (user_id, kind, title, organization, verification)
    values (v.member_id, v_kind, c.title, c.company, 'partner_confirmed');
    insert into notifications (user_id, type, actor_id, entity_type, entity_id, body)
    values (v.member_id, 'intro_update', current_profile_id(), 'organization', v.organization_id,
            case p_status when 'introduced' then 'You were introduced to ' || c.company || ' for ' || c.title
                          when 'interviewing' then 'Interview stage confirmed with ' || c.company
                          else 'Congratulations: your hire at ' || c.company || ' was confirmed' end);
  end if;
  return 'ok';
end $$;

-- ---------------------------------------------------------------- read models
create or replace function org_pipeline(p_org uuid)
returns table (kind text, id uuid, org_role_id uuid, member_id uuid, member_name text,
               role_title text, company text, status text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'pathway'::text, i.id, i.org_role_id, i.member_id, p.full_name, rp.title, r.company, i.status,
           coalesce(i.responded_at, i.created_at)
    from org_pathway_invites i
    join profiles p on p.id = i.member_id
    join organization_roles r on r.id = i.org_role_id
    join role_profiles rp on rp.id = r.role_profile_id
    where i.organization_id = p_org and is_org_admin(p_org)
    union all
    select 'intro'::text, n.id, n.org_role_id, n.member_id, p.full_name, rp.title, r.company, n.status, n.updated_at
    from org_introductions n
    join profiles p on p.id = n.member_id
    join organization_roles r on r.id = n.org_role_id
    join role_profiles rp on rp.id = r.role_profile_id
    where n.organization_id = p_org and is_org_admin(p_org)
  ) x
  order by 9 desc;
$$;

create or replace function my_network_requests()
returns table (kind text, id uuid, org_name text, role_title text, company text,
               status text, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'pathway'::text, i.id, o.name, rp.title, r.company, i.status, i.note, i.created_at
    from org_pathway_invites i
    join organizations o on o.id = i.organization_id
    join organization_roles r on r.id = i.org_role_id
    join role_profiles rp on rp.id = r.role_profile_id
    where i.member_id = current_profile_id()
    union all
    select 'intro'::text, n.id, o.name, rp.title, r.company, n.status, n.note, n.created_at
    from org_introductions n
    join organizations o on o.id = n.organization_id
    join organization_roles r on r.id = n.org_role_id
    join role_profiles rp on rp.id = r.role_profile_id
    where n.member_id = current_profile_id()
  ) x
  order by 8 desc
  limit 50;
$$;
