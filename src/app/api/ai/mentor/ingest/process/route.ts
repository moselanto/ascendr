import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { AI_CONFIGURED } from "@/lib/ai";
import { processSourceBatch } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ai/mentor/ingest/process  { source_id }
 * Embeds the next batch of a source's chunks. Called repeatedly by the mentor
 * workspace until status is "ready"; also resumes a failed or interrupted
 * source. Only the source's owner or a community owner/moderator may call it.
 * Quota is charged once, at upload, not per batch.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!AI_CONFIGURED) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { source_id?: string };
  const sourceId = String(body.source_id ?? "");
  if (sourceId.length === 0) return NextResponse.json({ error: "source_id is required" }, { status: 400 });

  const supabase = createClient();
  const { data: source } = await supabase.from("ai_sources").select("id, owner_id, community_id, status").eq("id", sourceId).maybeSingle();
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  let allowed = source.owner_id === profile.id;
  if (!allowed && source.community_id) {
    const { data: m } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", source.community_id)
      .eq("user_id", profile.id)
      .maybeSingle();
    allowed = m != null && ["owner", "moderator"].includes(m.role);
  }
  if (!allowed) return NextResponse.json({ error: "Only the mentor can process this source." }, { status: 403 });

  const progress = await processSourceBatch(sourceId);
  return NextResponse.json({ ok: progress.status !== "failed", source_id: sourceId, ...progress }, { status: progress.status === "failed" ? 502 : 200 });
}
