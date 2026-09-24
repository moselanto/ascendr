// Per-user quota enforcement for the AI routes.
//
// Why Postgres and not Upstash/Redis:
//   * No new vendor, no new env vars, no new failure mode — Supabase is already
//     a hard dependency, so this adds zero infrastructure.
//   * The same counter becomes plan enforcement later. Free/Pro/Premium limits
//     and abuse limits are the same mechanism, so there is nothing to rebuild
//     when billing lands.
//   * Volume is nowhere near where Redis matters. Revisit if a single route
//     exceeds roughly 50 req/s sustained.
//
// The trade-off: one extra DB round trip per AI call (~5-15ms), and a blocked
// request still costs a serverless invocation. Edge middleware with Upstash
// would reject before invocation. Not worth the added complexity yet.

import { createClient } from "@/lib/supabase/server";

export type QuotaBucket =
  | "ai:coach"
  | "ai:career-plan"
  | "ai:career-plan-step"
  | "ai:interview"
  | "ai:resume-review"
  | "ai:mentor-ask"
  | "ai:mentor-ingest";

export type Tier = "free" | "pro" | "premium";

/**
 * Daily call limits per tier.
 *
 * These are cost-control numbers, not product decisions — deliberately
 * generous enough that a genuine user never notices, tight enough that a
 * scripted loop stops within a few dollars. Tune once real usage data exists.
 */
const LIMITS: Record<QuotaBucket, Record<Tier, number>> = {
  "ai:coach":             { free: 25, pro: 200, premium: 600 },
  "ai:career-plan":       { free: 3,  pro: 25,  premium: 100 },
  "ai:career-plan-step":  { free: 20, pro: 150, premium: 500 },
  "ai:interview":         { free: 5,  pro: 50,  premium: 200 },
  "ai:resume-review":     { free: 3,  pro: 30,  premium: 120 },
  "ai:mentor-ask":        { free: 20, pro: 150, premium: 500 },
  // Ingestion is the expensive one: embeddings scale with document size.
  "ai:mentor-ingest":     { free: 2,  pro: 20,  premium: 60 },
};

const WINDOW_SECS = 86_400; // 24h fixed window

export type QuotaResult = {
  allowed: boolean;
  used: number;
  remaining: number;
  resetsAt: Date;
  limit: number;
};

/**
 * Consume one unit of quota for this user and bucket.
 *
 * Fails OPEN on infrastructure error: a broken quota table should degrade the
 * cost ceiling, not take the product down. Every fail-open is logged so the
 * condition is visible rather than silent.
 */
export async function consumeQuota(
  profileId: string,
  bucket: QuotaBucket,
  tier: Tier = "free"
): Promise<QuotaResult> {
  const limit = LIMITS[bucket][tier];
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc("consume_quota", {
      p_user_id: profileId,
      p_bucket: bucket,
      p_limit: limit,
      p_window_secs: WINDOW_SECS,
      p_tokens: 0,
    })
    .maybeSingle();

  if (error || !data) {
    console.error("consume_quota failed, failing open", { bucket, error });
    return {
      allowed: true,
      used: 0,
      remaining: limit,
      resetsAt: new Date(Date.now() + WINDOW_SECS * 1000),
      limit,
    };
  }

  const row = data as {
    allowed: boolean;
    used: number;
    remaining: number;
    resets_at: string;
  };

  return {
    allowed: row.allowed,
    used: row.used,
    remaining: row.remaining,
    resetsAt: new Date(row.resets_at),
    limit,
  };
}

/** Standard 429 body + headers. Keeps the shape consistent across routes. */
export function quotaExceededResponse(q: QuotaResult, bucket: QuotaBucket) {
  const retryAfter = Math.max(1, Math.ceil((q.resetsAt.getTime() - Date.now()) / 1000));
  return Response.json(
    {
      error: "Daily limit reached",
      message:
        `You've used all ${q.limit} of today's requests for this feature. ` +
        `Your limit resets at ${q.resetsAt.toISOString()}.`,
      bucket,
      limit: q.limit,
      resets_at: q.resetsAt.toISOString(),
      upgrade: true,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(q.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(q.resetsAt.getTime() / 1000)),
        "Retry-After": String(retryAfter),
      },
    }
  );
}

/**
 * Resolve the caller's billing tier.
 *
 * Stubbed to "free" until the subscriptions table lands. Centralised here so
 * that turning on billing is a one-function change, not a grep across routes.
 */
export async function getTier(_profileId: string): Promise<Tier> {
  return "free";
}
