import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { consumeQuota, getTier, quotaExceededResponse } from "@/lib/usage";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/career-plan/step
 * Body: { plan_id: string, index: number, done: boolean }
 * Toggles a step's done flag on a career plan the caller owns. Best-effort.
 *
 * Note this route does NOT call OpenAI despite living under /api/ai — it is a
 * plain database write. The quota here is not a spend ceiling; it bounds
 * write-spam against career_plans from an authenticated session. Limits are
 * correspondingly loose (20/150/500 per day) so normal checkbox use never
 * touches them.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quota = await consumeQuota(
    profile.id,
    "ai:career-plan-step",
    await getTier(profile.id)
  );
  if (!quota.allowed) return quotaExceededResponse(quota, "ai:career-plan-step");

  let body: { plan_id?: string; index?: number; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const planId = String(body.plan_id ?? "");
  const index = Number(body.index ?? -1);
  const done = !!body.done;
  if (!planId || index < 0) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { data: plan } = await supabase
    .from("career_plans")
    .select("id, steps")
    .eq("id", planId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const steps = Array.isArray(plan.steps) ? [...plan.steps] : [];
  if (index >= steps.length) return NextResponse.json({ error: "Bad index" }, { status: 400 });
  steps[index] = { ...steps[index], done };

  await supabase
    .from("career_plans")
    .update({ steps, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("user_id", profile.id);

  return NextResponse.json({ ok: true });
}
