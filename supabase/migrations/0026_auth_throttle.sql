-- 0026: throttle sign-in and sign-up attempts (SECURITY-AUDIT M-3)
--
-- Counts attempts per key in a fixed window. Keys are SHA-256 hashes of
-- "ip:<address>" or "email:<address>", so no raw IPs or emails are stored.
-- Called only by the server (service role) from the login actions.

create table if not exists auth_throttle (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);
create index if not exists auth_throttle_window_idx on auth_throttle (window_start);

alter table auth_throttle enable row level security;
-- No policies: only the service role can read or write.

create or replace function auth_throttle_hit(p_key text, p_limit int, p_window_secs int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_secs) * p_window_secs);
  v_count  int;
begin
  insert into auth_throttle (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = auth_throttle.count + 1
  returning count into v_count;
  -- Opportunistic cleanup of old windows.
  if random() < 0.01 then
    delete from auth_throttle where window_start < now() - interval '1 day';
  end if;
  return v_count <= p_limit;
end $$;

revoke all on function auth_throttle_hit(text, int, int) from public, anon, authenticated;
