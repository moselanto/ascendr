import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { askMentorClone } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/mentor/ask
 * Body: { community_id, mentor_name, question }
 * Members only. Returns { answer, citations, grounded }.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { community_id?: string; mentor_name?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const communityId = String(body.community_id || "");
  const mentorName = String(body.mentor_name || "the mentor").slice(0, 80);
  const question = String(body.question || "").trim();
  if (!communityId || !question) {
    return NextResponse.json({ error: "community_id and question are required" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: membership } = await supabase
    .from("community_members")
    .select("status")
    .eq("community_id", communityId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (membership?.status !== "active") {
    return NextResponse.json({ error: "Join the community to ask its mentor AI." }, { status: 403 });
  }

  const result = await askMentorClone(communityId, mentorName, question);
  return NextResponse.json(result);
}
