import { createAdminClient } from "@/lib/supabase/admin";

/**
 * First-party product analytics.
 *
 * Writes to `analytics_events`, which is the substrate for the four metrics
 * in PRD.md section 10 — career activation, network activation, career action
 * within 7 days, and career outcome within 90 days. Those are the numbers the
 * funding story rests on, so they are measured in our own database rather than
 * in a third-party tool we might lose access to.
 *
 * This is NOT error monitoring. Exceptions belong in Sentry (SECURITY-AUDIT.md
 * M-2), which needs a DSN before it can be wired up.
 *
 * TWO RULES
 *
 * 1. Tracking must never break the thing it is measuring. Every call swallows
 *    its own errors. A failed insert costs a data point, never a user action.
 *
 * 2. Never put personal data in `props`. Event names and IDs only — no email
 *    addresses, no resume text, no message bodies, no free-text a user typed.
 *    This table has no RLS policies and is read for aggregate reporting.
 */

export type AnalyticsEventName =
  // Activation funnel
  | "signup_completed"
  | "onboarding_started"
  | "goal_created"
  | "plan_created"
  // Career Intelligence
  | "gap_analysis_viewed"
  | "skill_added"
  | "plan_step_completed"
  // Network
  | "community_joined"
  | "mentor_asked"
  | "connection_requested"
  // Opportunity
  | "opportunity_viewed"
  | "opportunity_applied"
  // Outcomes
  | "outcome_recorded"
  // Operational
  | "ai_quota_exceeded";

type TrackOptions = {
  /** profiles.id — NOT auth.users.id. Null for pre-signup events. */
  userId?: string | null;
  /** Small, non-identifying facts about the event. See rule 2 above. */
  props?: Record<string, string | number | boolean | null>;
  sessionId?: string | null;
};

/**
 * Record a product event. Safe to call anywhere on the server; never throws,
 * never rejects, and never blocks the caller's own error handling.
 */
export async function track(
  name: AnalyticsEventName,
  { userId = null, props = {}, sessionId = null }: TrackOptions = {}
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("analytics_events").insert({
      name,
      user_id: userId,
      props,
      session_id: sessionId,
    });
    if (error) {
      console.warn(`analytics: insert failed for "${name}"`, error.message);
    }
  } catch (err) {
    // Includes a missing service role key in local dev. Warn once, move on —
    // analytics must degrade silently rather than take a page down.
    console.warn(`analytics: track("${name}") failed`, (err as Error).message);
  }
}

/**
 * Fire-and-forget wrapper for hot paths where you do not want to await the
 * round trip. Use in Server Actions that are about to redirect.
 */
export function trackAsync(
  name: AnalyticsEventName,
  options: TrackOptions = {}
): void {
  void track(name, options);
}
