-- 0028: count real network activity in the activation metric
--
-- career_activation_metrics.network_activated only counted career_actions of
-- kind community_joined / mentor_contacted / mentor_session / intro_requested.
-- Nothing in the app writes those rows when a member joins a community or
-- accepts a connection, so the admin metrics page showed 0 activated members
-- even when members had joined communities and connected.
--
-- A member now counts as network-activated if any of these is true:
--   * a completed career_action of one of the kinds above (unchanged)
--   * an active membership in at least one community
--   * at least one accepted connection
-- Same columns, same order, so the admin page needs no change.

create or replace view career_activation_metrics as
with cohort as (
  select id as user_id, created_at from profiles
)
select
  count(*)                                                     as total_members,
  count(*) filter (where exists (
    select 1 from career_goals g where g.user_id = c.user_id))  as with_goal,
  count(*) filter (where
    exists (
      select 1 from career_actions a
       where a.user_id = c.user_id
         and a.kind in ('mentor_contacted','mentor_session','community_joined','intro_requested')
         and a.status = 'completed')
    or exists (
      select 1 from community_members cm
       where cm.user_id = c.user_id and cm.status = 'active')
    or exists (
      select 1 from connections cn
       where cn.status = 'accepted'
         and (cn.requester_id = c.user_id or cn.addressee_id = c.user_id))
  )                                                             as network_activated,
  count(*) filter (where exists (
    select 1 from career_actions a
     where a.user_id = c.user_id
       and a.status = 'completed'
       and a.created_at <= c.created_at + interval '7 days'))   as acted_within_7d,
  count(*) filter (where exists (
    select 1 from career_outcomes o
     where o.user_id = c.user_id
       and o.occurred_on <= (c.created_at + interval '90 days')::date)) as outcome_within_90d
from cohort c;
