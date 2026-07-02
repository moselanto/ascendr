import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { runChat, AI_CONFIGURED } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/career-plan
 * Body: { goal: string, horizon?: string }
 * Generates a structured career plan (summary + 3-6 steps), saves it to
 * career_plans, and returns the saved row. Auth required.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { goal?: string; horizon?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const goal = (body.goal ?? "").trim();
  const horizon = (body.horizon ?? "90 days").trim();
  if (!goal) return NextResponse.json({ error: "A goal is required" }, { status: 400 });

  // Build the plan. When AI is off, fall back to a sensible scaffold.
  let summary = `A focused ${horizon} plan toward: ${goal}.`;
  let steps: { title: string; detail: string; done: boolean }[] = [];

  if (AI_CONFIGURED) {
    const raw = await runChat([
      {
        role: "system",
        content:
          "You are ASCENDR's AI Career Coach. Produce a concise, realistic career plan. " +
          "Respond ONLY with strict JSON of the shape " +
          '{"summary": string, "steps": [{"title": string, "detail": string}]}. ' +
          "Provide 4-6 steps, each with a short actionable title and one or two sentences of detail. No markdown, no prose outside the JSON.",
      },
      { role: "user", content: `Goal: ${goal}\nTime horizon: ${horizon}` },
    ]);
    try {
      const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      if (parsed?.summary) summary = String(parsed.summary);
      if (Array.isArray(parsed?.steps)) {
        steps = parsed.steps.slice(0, 6).map((s: { title?: string; detail?: string }) => ({
          title: String(s.title ?? "Step"),
          detail: String(s.detail ?? ""),
          done: false,
        }));
      }
    } catch {
      // If the model didn't return clean JSON, keep the summary and leave steps empty.
    }
  }

  if (steps.length === 0) {
    steps = [
      { title: "Clarify the target", detail: `Write a one-line definition of success for: ${goal}.`, done: false },
      { title: "Skill gap audit", detail: "List the 3 most important skills the role needs and rate yourself 1-5 on each.", done: false },
      { title: "Build proof", detail: "Ship one small project or artifact that demonstrates the top skill.", done: false },
      { title: "Grow the network", detail: "Reach out to 3 people already in this role for a 15-minute conversation.", done: false },
      { title: "Apply and iterate", detail: "Apply to 5 well-matched roles; refine your pitch after each response.", done: false },
    ];
  }

  const { data: saved, error } = await supabase
    .from("career_plans")
    .insert({ user_id: profile.id, goal, horizon, summary, steps, status: "active" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: saved, ai: AI_CONFIGURED });
}
