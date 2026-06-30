import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { AI_CONFIGURED, embed, chunkText } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/mentor/ingest
 * Body: { community_id, title, content }
 * Owner/moderator only. Chunks + embeds the content into ai_chunks for the
 * community's Mentor Clone. Returns { ok, chunks }.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!AI_CONFIGURED) {
    return NextResponse.json(
      { error: "AI is not configured. Add OPENAI_API_KEY to enable ingestion." },
      { status: 503 }
    );
  }

  let body: { community_id?: string; title?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const communityId = String(body.community_id || "");
  const title = String(body.title || "Untitled source").slice(0, 120);
  const content = String(body.content || "").trim();
  if (!communityId || !content) {
    return NextResponse.json({ error: "community_id and content are required" }, { status: 400 });
  }

  const supabase = createClient();

  // Authorization: must be owner/moderator of the community.
  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "moderator"].includes(membership.role)) {
    return NextResponse.json({ error: "Only the mentor (owner/mod) can add sources." }, { status: 403 });
  }

  // Record the source (with original text for reference).
  const { data: source, error: srcErr } = await supabase
    .from("ai_sources")
    .insert({
      owner_id: profile.id,
      community_id: communityId,
      type: "text",
      title,
      content,
      status: "processing",
    })
    .select("id")
    .single();
  if (srcErr || !source) {
    return NextResponse.json({ error: srcErr?.message || "Could not create source" }, { status: 500 });
  }

  // Chunk + embed.
  const chunks = chunkText(content);
  const vectors = await embed(chunks);
  if (vectors.length !== chunks.length) {
    await supabase.from("ai_sources").update({ status: "processing" }).eq("id", source.id);
    return NextResponse.json({ error: "Embedding failed. Check your OpenAI key/quota." }, { status: 502 });
  }

  const rows = chunks.map((content, i) => ({
    source_id: source.id,
    community_id: communityId,
    owner_id: profile.id,
    source_title: title,
    chunk_index: i,
    content,
    embedding: vectors[i],
  }));

  // Insert in batches to stay within payload limits.
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from("ai_chunks").insert(rows.slice(i, i + BATCH));
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await supabase.from("ai_sources").update({ status: "ready" }).eq("id", source.id);
  return NextResponse.json({ ok: true, chunks: rows.length, title });
}
