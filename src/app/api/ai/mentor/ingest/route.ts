import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { AI_CONFIGURED, embed, chunkText } from "@/lib/ai";

export const dynamic = "force-dynamic";

// Plain-text file types we can parse with zero extra dependencies.
const TEXT_EXTS = [".txt", ".md", ".markdown", ".csv", ".text"];

/**
 * POST /api/ai/mentor/ingest
 * Accepts EITHER:
 *   - application/json: { community_id, title, content }   (paste text)
 *   - multipart/form-data: community_id, title?, file       (upload .txt/.md/.csv)
 * Owner/moderator only. Chunks + embeds into ai_chunks for the community's
 * Mentor Clone. Returns { ok, chunks, title }.
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

  // ---- Parse input: JSON (paste) or form-data (file upload) ----
  let communityId = "";
  let title = "Untitled source";
  let content = "";
  let sourceType = "text";

  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      communityId = String(form.get("community_id") || "");
      const file = form.get("file");
      const givenTitle = String(form.get("title") || "").trim();

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
      }
      const name = file.name || "upload";
      const lower = name.toLowerCase();

      if (lower.endsWith(".pdf")) {
        return NextResponse.json(
          {
            error:
              "PDF parsing isn't enabled yet. For now, please copy the text out of the PDF and paste it, or upload a .txt/.md file. (PDF support is coming next.)",
          },
          { status: 415 }
        );
      }
      if (!TEXT_EXTS.some((ext) => lower.endsWith(ext))) {
        return NextResponse.json(
          { error: "Unsupported file type. Upload a .txt, .md, or .csv file, or paste text instead." },
          { status: 415 }
        );
      }
      if (file.size > 2_000_000) {
        return NextResponse.json({ error: "File too large (max 2 MB of text)." }, { status: 413 });
      }

      content = (await file.text()).trim();
      title = (givenTitle || name).slice(0, 120);
      sourceType = "file";
    } else {
      const body = (await req.json()) as { community_id?: string; title?: string; content?: string };
      communityId = String(body.community_id || "");
      title = String(body.title || "Untitled source").slice(0, 120);
      content = String(body.content || "").trim();
    }
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  if (!communityId || !content) {
    return NextResponse.json({ error: "community_id and non-empty content are required" }, { status: 400 });
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
      type: sourceType,
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
