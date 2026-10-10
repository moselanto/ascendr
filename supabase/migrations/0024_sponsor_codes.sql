-- 0024: sponsor codes
--
-- A sponsor (foundation, employer, county programme) pays for a number of
-- seats. Staff create a code in /app/admin/sponsors; each member who redeems
-- it gets Plus for the code's number of months. One redemption per member
-- per code, and never more redemptions than seats.
-- A member with an active Starter or Pro plan is not downgraded.

create table if not exists sponsor_codes (
  code          text primary key check (code ~ '^[A-Z0-9-]{6,32}$'),
  sponsor_name  text not null check (char_length(sponsor_name) between 2 and 120),
  seats         int  not null check (seats between 1 and 100000),
  used          int  not null default 0,
  months        int  not null default 3 check (months between 1 and 24),
  expires_at    timestamptz,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists sponsor_redemptions (
  code         text not null references sponsor_codes(code) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  redeemed_at  timestamptz not null default now(),
  primary key (code, user_id)
);

alter table sponsor_codes enable row level security;
alter table sponsor_redemptions enable row level security;
drop policy if exists "sponsor_redemptions_read_own" on sponsor_redemptions;
create policy "sponsor_redemptions_read_own" on sponsor_redemptions
  for select using (user_id = current_profile_id());
-- No other policies: codes are managed by the service role (admin console)
-- and redeemed only through redeem_sponsor_code().

create or replace function redeem_sponsor_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me   uuid := current_profile_id();
  v      sponsor_codes%rowtype;
  s      subscriptions%rowtype;
  v_has  boolean;
  v_from timestamptz;
begin
  if v_me is null then return 'not_signed_in'; end if;
  select * into v from sponsor_codes where code = upper(trim(p_code)) for update;
  if not found then return 'invalid'; end if;
  if v.expires_at is not null and v.expires_at < now() then return 'expired'; end if;
  if exists (select 1 from sponsor_redemptions where code = v.code and user_id = v_me) then return 'already'; end if;
  if v.used >= v.seats then return 'full'; end if;

  select * into s from subscriptions where user_id = v_me;
  v_has := found;
  if v_has and s.plan in ('starter','pro') and s.status in ('active','non_renewing','past_due')
     and (s.current_period_end is null or s.current_period_end > now()) then
    return 'has_plan';
  end if;
  v_from := case when v_has and s.plan = 'plus' and s.current_period_end > now() then s.current_period_end else now() end;

  insert into sponsor_redemptions (code, user_id) values (v.code, v_me);
  update sponsor_codes set used = used + 1 where code = v.code;
  insert into subscriptions (user_id, plan, status, provider, current_period_end, updated_at)
  values (v_me, 'plus', 'active', 'sponsor', v_from + make_interval(months => v.months), now())
  on conflict (user_id) do update
    set plan = 'plus', status = 'active', provider = 'sponsor',
        current_period_end = excluded.current_period_end, updated_at = now();
  return 'ok';
end $$;

revoke all on function redeem_sponsor_code(text) from public, anon;
grant execute on function redeem_sponsor_code(text) to authenticated;
