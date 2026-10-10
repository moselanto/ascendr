-- 0021: Paystack webhook replay protection
--
-- Paystack retries a webhook until it gets a 200, and a captured request can
-- be replayed. Each processed event is recorded here by the SHA-256 of its
-- raw, signature-verified body; a second delivery of the same body is
-- acknowledged without touching the subscription again. Without this, a
-- replayed charge.success would push current_period_end another month out.
--
-- Written only by the service role from /api/paystack/webhook.

create table if not exists paystack_events (
  id           text primary key,            -- sha256 hex of the raw body
  event        text not null,
  reference    text,
  received_at  timestamptz not null default now()
);
create index if not exists paystack_events_received_idx on paystack_events (received_at);

alter table paystack_events enable row level security;
-- No policies: nobody but the service role can read or write this table.
