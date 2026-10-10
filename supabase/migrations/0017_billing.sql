-- 0017: billing (Paystack subscriptions)
-- One row per member. Written only by the server (service role) from the
-- checkout callback and the Paystack webhook; members can read their own row.

create table if not exists subscriptions (
  user_id            uuid primary key references profiles(id) on delete cascade,
  plan               text not null check (plan in ('starter','pro')),
  status             text not null default 'pending'
                       check (status in ('pending','active','non_renewing','past_due','cancelled')),
  provider           text not null default 'paystack',
  email              text,
  customer_code      text,
  subscription_code  text,
  email_token        text,
  current_period_end timestamptz,
  last_reference     text,
  updated_at         timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on subscriptions (customer_code);
create index if not exists subscriptions_sub_idx on subscriptions (subscription_code);
create index if not exists subscriptions_email_idx on subscriptions (lower(email));

alter table subscriptions enable row level security;
drop policy if exists "subscriptions_read_own" on subscriptions;
create policy "subscriptions_read_own" on subscriptions
  for select using (user_id = current_profile_id());
-- No insert/update policies: only the service role writes billing state.
