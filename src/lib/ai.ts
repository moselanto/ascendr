// Server-side LLM wrapper for ASCENDR's AI surfaces (Career Coach + Mentor Clone).
// Uses OpenAI's Chat Completions API via fetch (no SDK dependency).
// Gracefully degrades when OPENAI_API_KEY is absent so the app still builds/runs.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const AI_CONFIGURED = !!process.env.OPENAI_API_KEY;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const COACH_SYSTEM_PROMPT = `You are ASCENDR's AI Career Coach — part of "The Global AI Career Growth Ecosystem."
Your role: give practical, encouraging, specific career guidance to professionals,
students, founders, and career switchers.

Principles:
- Be warm, concise, and actionable. Prefer concrete next steps over generic advice.
- When the user shares a goal, propose a short plan (3-5 steps) and a single next action.
- For interviews/resumes, give specific, example-driven feedback.
- You are an AI coach, not a human mentor. If a question needs a real human expert,
  say so and suggest the user "Ask the real mentor" in their community.
- Never invent facts about the user. Ask a brief clarifying question if needed.
- Keep responses focused; use short paragraphs or tight bullet lists.`;

/**
 * Run a chat completion. Returns the assistant text, or a friendly fallback
 * string when the key is missing or the API errors.
 */
export async function runChat(messages: ChatMessage[]): Promise<string> {
  if (!AI_CONFIGURED) {
    return "The AI Career Coach isn't switched on yet. Add an OPENAI_API_KEY in your environment variables to enable grounded, real-time coaching. (Everything else in ASCENDR works without it.)";
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("OpenAI error", res.status, detail);
      return "I hit a problem reaching the AI service just now. Please try again in a moment.";
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || "I didn't catch that — could you rephrase?";
  } catch (err) {
    console.error("runChat failed", err);
    return "I couldn't reach the AI service. Please try again shortly.";
  }
}
