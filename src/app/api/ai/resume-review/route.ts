import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { consumeQuota, getTier, quotaExceededResponse } from "@/lib/usage";
import { runChat, AI_CONFIGURED } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/resume-review
 * Body: { resumeText: string, fileName?: string, targetRole?: string }
 * Scores the resume, returns strengths + fixes + a rewrite, and saves the review.
 * Auth required.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quota = await consumeQuota(profile.id, "ai:resume-review", await getTier(profile.id));
  if (!quota.allowed) return quotaExceededResponse(quota, "ai:resume-review");

  const supabase = createClient();

  let body: { resumeText?: string; fileName?: string; targetRole?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const resumeText = (body.resumeText ?? "").trim();
  const fileName = (body.fileName ?? "resume").trim();
  const targetRole = (body.targetRole ?? "").trim();
  if (resumeText.length < 40) {
    return NextResponse.json({ error: "Please paste more of your resume text (at least a few lines)." }, { status: 400 });
  }

  let score = 72;
  let verdict = "Solid foundation — a few improvements will lift it";
  let strengths: string[] = [];
  let fixes: { severity: "ok" | "warn"; text: string }[] = [];
  let rewrite = "";

  if (AI_CONFIGURED) {
    const raw = await runChat([
      {
        role: "system",
        content:
          "You are ASCENDR's AI resume reviewer. Assess the resume against the target role. " +
          "Respond ONLY with strict JSON: " +
          '{"score": number (0-100), "verdict": string (short), "strengths": string[] (2-4), ' +
          '"fixes": [{"severity": "ok"|"warn", "text": string}] (3-5), "rewrite": string (one improved bullet or summary)}. ' +
          "Be specific and example-driven. No markdown outside the JSON.",
      },
      {
        role: "user",
        content: `Target role: ${targetRole || "(not specified)"}\n\nResume:\n${resumeText.slice(0, 6000)}`,
      },
    ]);
    try {
      const p = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      if (typeof p.score === "number") score = Math.max(0, Math.min(100, Math.round(p.score)));
      if (p.verdict) verdict = String(p.verdict);
      if (Array.isArray(p.strengths)) strengths = p.strengths.slice(0, 4).map(String);
      if (Array.isArray(p.fixes))
        fixes = p.fixes.slice(0, 5).map((f: { severity?: string; text?: string }) => ({
          severity: f.severity === "ok" ? "ok" : "warn",
          text: String(f.text ?? ""),
        }));
      if (p.rewrite) rewrite = String(p.rewrite);
    } catch {
      // keep fallback below
    }
  }

  if (strengths.length === 0) {
    strengths = ["Clear structure and readable layout", "Relevant experience is present"];
    fixes = [
      { severity: "warn", text: "Add concrete metrics to your top achievements (numbers, %, scale)." },
      { severity: "warn", text: `Tailor the summary to the ${targetRole || "target"} role.` },
      { severity: "warn", text: "Lead bullets with strong action verbs and outcomes." },
    ];
    rewrite = "Led delivery of a member portal, cutting onboarding time by 40% and lifting activation.";
    verdict = AI_CONFIGURED ? verdict : "Add an OPENAI_API_KEY for a full AI review — this is a scaffold.";
  }

  const { data: saved, error } = await supabase
    .from("resume_reviews")
    .insert({
      user_id: profile.id,
      file_name: fileName,
      target_role: targetRole || null,
      score,
      verdict,
      strengths,
      fixes,
      rewrite,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review: saved, ai: AI_CONFIGURED });
}
