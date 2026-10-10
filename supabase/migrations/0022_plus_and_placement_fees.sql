-- 0022: Plus plan for individuals, and the placement (hire) fee
--
-- 1. subscriptions.plan accepts 'plus' (KES 499/month, one-off M-Pesa or card
--    payment; the member renews by paying again).
-- 2. placement_fees: when a consented introduction is marked 'hired', one fee
--    row is created for the hiring company: KES 25,000 flat, of which
--    KES 5,000 is the sourcing network's share. Members never pay it.
--    Keep these amounts in sync with HIRE_FEE in src/lib/billing.ts.
--    The platform admin invoices the company and tracks status in
--    /app/admin/fees; network admins can read their own network's fees.

alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions add constraint subscriptions_plan_check
  check (plan in ('plus','starter','pro'));

create table if not exists placement_fees (
  id                 uuid primary key default uuid_generate_v4(),
  introduction_id    uuid not null unique references org_introductions(id) on delete cascade,
  organization_id    uuid not null references organizations(id) on delete cascade,
  member_id          uuid references profiles(id) on delete set null,
  company            text not null,
  role_title         text,
  amount_kes         int  not null default 25000 check (amount_kes >= 0),
  network_share_kes  int  not null default 5000  check (network_share_kes >= 0),
  status             text not null default 'due' check (status in ('due','invoiced','paid','waived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists placement_fees_org_idx on placement_fees (organization_id, created_at desc);

alter table placement_fees enable row level security;
drop policy if exists "placement_fees_org_admin_read" on placement_fees;
create policy "placement_fees_org_admin_read" on placement_fees
  for select using (is_org_admin(organization_id));
-- No insert/update policies: the trigger below and the service role write.

create or replace function create_placement_fee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'hired' and old.status is distinct from 'hired' then
    insert into placement_fees (introduction_id, organization_id, member_id, company, role_title)
    select new.id, new.organization_id, new.member_id, r.company, rp.title
      from organization_roles r
      left join role_profiles rp on rp.id = r.role_profile_id
     where r.id = new.org_role_id
    on conflict (introduction_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists org_introductions_placement_fee on org_introductions;
create trigger org_introductions_placement_fee
  after update of status on org_introductions
  for each row execute function create_placement_fee();
