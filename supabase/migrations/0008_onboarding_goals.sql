-- ASCENDR — Onboarding career goals
-- Adds the fields captured by the onboarding flow (AUTH-006/007) to profiles.
-- Safe to run multiple times (idempotent).

alter table profiles
  add column if not exists career_goal text
    check (career_goal in ('switch','promote','startup','learn')),
  add column if not exists target_roles text[] default '{}',
  add column if not exists onboarded_at timestamptz;

comment on column profiles.career_goal is
  'Onboarding goal: switch=Switch careers, promote=Get promoted, startup=Build a startup, learn=Learn a skill';
comment on column profiles.target_roles is
  'Optional target roles chosen during onboarding (free-text chips).';
comment on column profiles.onboarded_at is
  'Timestamp the member completed onboarding; null = not yet onboarded.';
