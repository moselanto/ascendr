import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runChat, COACH_SYSTEM_PROMPT, type ChatMessage } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/coach
 * Body: { messages: { role: "user" | "assistant", content: string }[] }
 * Returns: { reply: string }
 * Auth required (session cookie). The system prompt is injected server-side.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-12); // keep recent context bounded

  const reply = await runChat([
    { role: "system", content: COACH_SYSTEM_PROMPT },
    ...history,
  ]);

  return NextResponse.json({ reply });
}
