import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data";
import { consumeQuota, getTier, quotaExceededResponse } from "@/lib/usage";
import { runChat, AI_CONFIGURED } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/interview
 * Two actions:
 *   { action: "question", role, kind, asked?: string[] }
 *     -> returns { question }
 *   { action: "feedback", role, kind, question, answer }
 *     -> returns { feedback, rating } (rating 1-5)
 * Auth required.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quota = await consumeQuota(profile.id, "ai:interview", await getTier(profile.id));
  if (!quota.allowed) return quotaExceededResponse(quota, "ai:interview");

  let body: {
    action?: string;
    role?: string;
    kind?: string;
    question?: string;
    answer?: string;
    asked?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = (body.role ?? "the role").trim();
  const kind = ["behavioral", "technical", "mixed"].includes(body.kind ?? "")
    ? body.kind
    : "behavioral";

  // ---- Ask the next question ----
  if (body.action === "question") {
    if (!AI_CONFIGURED) {
      const bank: Record<string, string[]> = {
        behavioral: [
          "Tell me about a time you led a project under a tight deadline. What did you do?",
          "Describe a conflict with a teammate and how you resolved it.",
          "Walk me through a failure and what you learned from it.",
        ],
        technical: [
          "How would you design a system to handle 10x your current traffic?",
          "Explain a technical trade-off you made recently and why.",
          "How do you approach debugging an issue you've never seen before?",
        ],
        mixed: [
          "Why this role, and what makes you a strong fit?",
          "Tell me about a project you're proud of — technical and human sides.",
          "Where do you want to grow in the next 12 months?",
        ],
      };
      const pool = bank[kind as string] ?? bank.behavioral;
      const asked = new Set(body.asked ?? []);
      const next = pool.find((q) => !asked.has(q)) ?? pool[0];
      return NextResponse.json({ question: next, ai: false });
    }

    const q = await runChat([
      {
        role: "system",
        content:
          "You are an experienced interviewer for ASCENDR's mock interviews. " +
          "Ask ONE realistic interview question at a time for the given role and type. " +
          "Return only the question text, no numbering or preamble. Do not repeat any question in the provided list.",
      },
      {
        role: "user",
        content: `Role: ${role}\nType: ${kind}\nAlready asked: ${(body.asked ?? []).join(" | ") || "(none)"}`,
      },
    ]);
    return NextResponse.json({ question: q.trim(), ai: true });
  }

  // ---- Give feedback on an answer ----
  if (body.action === "feedback") {
    const question = (body.question ?? "").trim();
    const answer = (body.answer ?? "").trim();
    if (!answer) return NextResponse.json({ error: "An answer is required" }, { status: 400 });

    if (!AI_CONFIGURED) {
      return NextResponse.json({
        feedback:
          "Good start. To strengthen this: use the STAR structure (Situation, Task, Action, Result), lead with the outcome, and quantify the impact where you can. (Add an OPENAI_API_KEY for detailed AI feedback.)",
        rating: 3,
        ai: false,
      });
    }

    const raw = await runChat([
      {
        role: "system",
        content:
          "You are an expert interview coach. Give concise, specific feedback on the candidate's answer. " +
          "Respond ONLY with strict JSON: {\"feedback\": string (2-4 sentences, specific and constructive), \"rating\": number (1-5)}.",
      },
      {
        role: "user",
        content: `Role: ${role}\nType: ${kind}\nQuestion: ${question}\nCandidate answer: ${answer}`,
      },
    ]);
    let feedback = raw;
    let rating = 3;
    try {
      const p = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      if (p.feedback) feedback = String(p.feedback);
      if (typeof p.rating === "number") rating = Math.max(1, Math.min(5, Math.round(p.rating)));
    } catch {
      // keep raw text as feedback
    }
    return NextResponse.json({ feedback, rating, ai: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
