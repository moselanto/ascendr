// Server-side LLM wrapper for ASCENDR's AI surfaces (Career Coach + Mentor Clone).
// Uses OpenAI's Chat Completions + Embeddings APIs via fetch (no SDK dependency).
// Gracefully degrades when OPENAI_API_KEY is absent so the app still builds/runs.

import { createClient } from "@/lib/supabase/server";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const AI_CONFIGURED = !!process.env.OPENAI_API_KEY;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small"; // 1536 dims

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

/** Run a chat completion. Returns assistant text, or a friendly fallback. */
export async function runChat(messages: ChatMessage[]): Promise<string> {
  if (!AI_CONFIGURED) {
    return "The AI isn't switched on yet. Add an OPENAI_API_KEY in your environment variables to enable grounded, real-time answers. (Everything else in ASCENDR works without it.)";
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.5, max_tokens: 700 }),
    });
    if (!res.ok) {
      console.error("OpenAI chat error", res.status, await res.text());
      return "I hit a problem reaching the AI service just now. Please try again in a moment.";
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || "I didn't catch that — could you rephrase?";
  } catch (err) {
    console.error("runChat failed", err);
    return "I couldn't reach the AI service. Please try again shortly.";
  }
}

/** Embed an array of texts. Returns one 1536-dim vector per input (or [] on failure). */
export async function embed(texts: string[]): Promise<number[][]> {
  if (!AI_CONFIGURED || texts.length === 0) return [];
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    });
    if (!res.ok) {
      console.error("OpenAI embed error", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return (data?.data ?? []).map((d: { embedding: number[] }) => d.embedding);
  } catch (err) {
    console.error("embed failed", err);
    return [];
  }
}

/** Split text into overlapping chunks (~1000 chars, 150 overlap) for embedding. */
export function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

export type Citation = { source_title: string; chunk_index: number; similarity: number };

/**
 * Mentor Clone RAG answer. Embeds the question, retrieves top-k chunks for the
 * community via the match_ai_chunks RPC, then answers ONLY from that context with
 * inline-cited sources. Returns the answer + the citations used.
 */
export async function askMentorClone(
  communityId: string,
  mentorName: string,
  question: string
): Promise<{ answer: string; citations: Citation[]; grounded: boolean }> {
  if (!AI_CONFIGURED) {
    return {
      answer:
        "The Mentor's AI isn't switched on yet. Add an OPENAI_API_KEY to enable grounded answers from this mentor's content.",
      citations: [],
      grounded: false,
    };
  }

  const [qEmbedding] = await embed([question]);
  if (!qEmbedding) {
    return { answer: "I couldn't process that question. Please try again.", citations: [], grounded: false };
  }

  const supabase = createClient();
  const { data: matches, error } = await supabase.rpc("match_ai_chunks", {
    p_community_id: communityId,
    p_query_embedding: qEmbedding,
    p_match_count: 6,
  });

  if (error) {
    console.error("match_ai_chunks error", error);
    return { answer: "I couldn't search this mentor's knowledge right now. Please try again.", citations: [], grounded: false };
  }

  const chunks = (matches ?? []) as {
    content: string;
    source_title: string;
    chunk_index: number;
    similarity: number;
  }[];

  // No relevant content -> be honest and route to the human.
  const relevant = chunks.filter((c) => c.similarity > 0.2);
  if (relevant.length === 0) {
    return {
      answer: `I don't have anything in ${mentorName}'s uploaded content that covers this yet. You can use the "Ask the real mentor" button to reach ${mentorName} directly.`,
      citations: [],
      grounded: false,
    };
  }

  const context = relevant
    .map((c, idx) => `[Source ${idx + 1}: ${c.source_title} · part ${c.chunk_index + 1}]\n${c.content}`)
    .join("\n\n---\n\n");

  const system = `You are the AI clone of ${mentorName}, a mentor on ASCENDR.
Answer the member's question ONLY using the provided source excerpts from ${mentorName}'s own content.
Rules:
- Speak in ${mentorName}'s voice, helpful and direct.
- Use ONLY the provided context. Do NOT use outside knowledge.
- If the context doesn't fully answer, say what you can and note the gap.
- End with a "Sources:" line listing the [Source N] labels you actually used.
- Never fabricate sources or facts.`;

  const answer = await runChat([
    { role: "system", content: system },
    { role: "user", content: `Question: ${question}\n\nContext:\n${context}` },
  ]);

  const citations: Citation[] = relevant.map((c) => ({
    source_title: c.source_title,
    chunk_index: c.chunk_index,
    similarity: c.similarity,
  }));

  return { answer, citations, grounded: true };
}
