import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { consumeQuota, getTier, quotaExceededResponse } from "@/lib/usage";
import { AI_CONFIGURED, chunkText } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { processSourceBatch } from "@/lib/ingest";
import { checkFileBytes, checkText } from "@/lib/ingest-validate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Plain-text file types we can parse with zero extra dependencies.
const TEXT_EXTS = [".txt", ".md", ".markdown", ".csv", ".text"];

/**
 * POST /api/ai/mentor/ingest
 * Accepts EITHER:
 *   - application/json: { community_id, title, content }   (paste text)
 *   - multipart/form-data: community_id, title?, file       (upload .txt/.md/.csv)
 * Owner/moderator only. Saves the chunks, embeds the first batch, and returns
 * { ok, source_id, title, status, total, done }. The client then calls
 * /api/ai/mentor/ingest/process until status is "ready" (migration 0025).
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

      // Inspect the bytes, not just the extension (SECURITY-AUDIT M-4).
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fileCheck = checkFileBytes(bytes);
      if (fileCheck.ok === false) return NextResponse.json({ error: fileCheck.error }, { status: 415 });
      content = new TextDecoder("utf-8").decode(bytes).trim();
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

  if (communityId && content) {
    const textCheck = checkText(content);
    if (textCheck.ok === false) return NextResponse.json({ error: textCheck.error }, { status: 422 });
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

  // Ingestion is the most expensive AI path — embedding cost scales with
  // document size, so a single request can be hundreds of API calls. Quota is
  // consumed here: after authorization (so a non-mentor cannot burn it) and
  // before any embedding work begins.
  const quota = await consumeQuota(profile.id, "ai:mentor-ingest", await getTier(profile.id));
  if (!quota.allowed) return quotaExceededResponse(quota, "ai:mentor-ingest");

  const chunks = chunkText(content);
  if (chunks.length === 0) return NextResponse.json({ error: "There is no text to add." }, { status: 400 });

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
      total_chunks: chunks.length,
      done_chunks: 0,
    })
    .select("id")
    .single();
  if (srcErr || !source) {
    const hint = /total_chunks|done_chunks/.test(srcErr?.message ?? "") ? " Run migration 0025 in Supabase." : "";
    return NextResponse.json({ error: (srcErr?.message || "Could not create source") + hint }, { status: 500 });
  }

  // Save every chunk now, without embeddings. This is fast (no AI calls), so
  // the upload can never time out; embeddings are filled in batch by batch.
  const admin = createAdminClient();
  const rows = chunks.map((text, i) => ({
    source_id: source.id,
    community_id: communityId,
    owner_id: profile.id,
    source_title: title,
    chunk_index: i,
    content: text,
  }));
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await admin.from("ai_chunks").insert(rows.slice(i, i + BATCH));
    if (error) {
      await admin.from("ai_sources").update({ status: "failed", error: error.message }).eq("id", source.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Embed the first batch straight away; the browser asks for the rest.
  const progress = await processSourceBatch(source.id);
  return NextResponse.json({ ok: true, source_id: source.id, title, ...progress });
}
