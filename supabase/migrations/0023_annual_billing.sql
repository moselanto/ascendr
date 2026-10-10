-- 0023: yearly billing for Starter and Pro
--
-- Records whether a subscription is paid monthly or yearly, so Billing can
-- show the right price and renewal date. Yearly costs 10 months' price
-- (two months free): Starter KES 130,000, Pro KES 260,000.
-- Paystack needs two extra plans with interval "annually"; put their codes
-- in PAYSTACK_PLAN_STARTER_ANNUAL and PAYSTACK_PLAN_PRO_ANNUAL.

alter table subscriptions
  add column if not exists billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly','annual'));
