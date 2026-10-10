import { createAdminClient } from "@/lib/supabase/admin";
import { embed } from "@/lib/ai";

/**
 * Batched embedding for mentor sources (migration 0025, SECURITY-AUDIT H-1).
 *
 * Chunks are saved without embeddings when a source is uploaded; this fills
 * in one batch per call, so no single request does more than a few seconds of
 * work. ai_chunks has no client policies, so writes use the service role.
 */

export const EMBED_BATCH = 64;

export type IngestProgress = { status: "processing" | "ready" | "failed"; total: number; done: number; error?: string };

export async function processSourceBatch(sourceId: string): Promise<IngestProgress> {
  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("ai_chunks")
    .select("id, content")
    .eq("source_id", sourceId)
    .is("embedding", null)
    .order("chunk_index", { ascending: true })
    .limit(EMBED_BATCH);
  if (error) return fail(sourceId, `Could not read chunks: ${error.message}`);

  const rows = (pending ?? []) as { id: string; content: string }[];
  if (rows.length > 0) {
    const vectors = await embed(rows.map((r) => r.content));
    if (vectors.length !== rows.length) return fail(sourceId, "Embedding failed. Check the OpenAI key and quota, then resume.");
    const results = await Promise.all(rows.map((r, i) => admin.from("ai_chunks").update({ embedding: vectors[i] }).eq("id", r.id)));
    const bad = results.find((r) => r.error);
    if (bad?.error) return fail(sourceId, `Could not save embeddings: ${bad.error.message}`);
  }

  const [{ count: remaining }, { count: total }] = await Promise.all([
    admin.from("ai_chunks").select("id", { count: "exact", head: true }).eq("source_id", sourceId).is("embedding", null),
    admin.from("ai_chunks").select("id", { count: "exact", head: true }).eq("source_id", sourceId),
  ]);
  const t = total ?? 0;
  const done = t - (remaining ?? 0);
  const status = (remaining ?? 0) === 0 ? "ready" : "processing";
  await admin
    .from("ai_sources")
    .update({ status, total_chunks: t, done_chunks: done, error: null, updated_at: new Date().toISOString() })
    .eq("id", sourceId);
  return { status, total: t, done };
}

async function fail(sourceId: string, message: string): Promise<IngestProgress> {
  const admin = createAdminClient();
  const { data } = await admin.from("ai_sources").select("total_chunks, done_chunks").eq("id", sourceId).maybeSingle();
  await admin.from("ai_sources").update({ status: "failed", error: message, updated_at: new Date().toISOString() }).eq("id", sourceId);
  return { status: "failed", total: data?.total_chunks ?? 0, done: data?.done_chunks ?? 0, error: message };
}
