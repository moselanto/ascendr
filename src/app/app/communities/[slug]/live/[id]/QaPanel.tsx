"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { askLiveQuestion } from "@/app/app/live-actions";

export type LiveQuestion = {
  id: string;
  body: string | null;
  votes: number;
  status: "open" | "answered" | "pinned";
  anonymous: boolean;
  created_at: string;
};

/**
 * Realtime Q&A panel for a live session. Renders the question board and the
 * ask box, subscribes to INSERT/UPDATE on live_questions for this session so
 * new questions from any account appear instantly, and submits new questions
 * through the askLiveQuestion server action.
 */
export default function QaPanel({
  sessionId,
  slug,
  initialQuestions,
}: {
  sessionId: string;
  slug: string;
  initialQuestions: LiveQuestion[];
}) {
  const [questions, setQuestions] = useState<LiveQuestion[]>(initialQuestions);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Keep local state in sync when the server re-renders with fresh data.
  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  // Realtime: stream inserts + updates for this session's questions.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live_qa:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const q = payload.new as LiveQuestion;
          setQuestions((prev) => (prev.some((x) => x.id === q.id) ? prev : [...prev, q]));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const q = payload.new as LiveQuestion;
          setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...q } : x)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Sort: pinned first, then by votes desc, then newest.
  const sorted = [...questions].sort((a, b) => {
    if (a.status === "pinned" && b.status !== "pinned") return -1;
    if (b.status === "pinned" && a.status !== "pinned") return 1;
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.created_at < b.created_at ? -1 : 1;
  });

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await askLiveQuestion(formData);
      formRef.current?.reset();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex gap-1 border-b border-border">
        <button className="border-b-2 border-primary px-3.5 py-2.5 text-small font-semibold text-primary">
          Q&amp;A
        </button>
        <button className="px-3.5 py-2.5 text-small font-semibold text-text-secondary">Chat</button>
        <button className="px-3.5 py-2.5 text-small font-semibold text-text-secondary">
          Participants
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.length === 0 && (
          <p className="py-6 text-center text-small text-text-secondary">
            No questions yet. Be the first to ask.
          </p>
        )}
        {sorted.map((q) => {
          const answered = q.status === "answered";
          const pinned = q.status === "pinned";
          return (
            <div
              key={q.id}
              className={`rounded-sm border border-border p-2.5 ${answered ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <b className="text-small">{q.body}</b>
                {pinned && (
                  <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-caption font-semibold text-primary">
                    📌
                  </span>
                )}
              </div>
              <div className="mt-1 text-caption text-text-secondary">
                ▲ {q.votes} · {answered ? "✅ answered" : pinned ? "pinned" : "open"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ask box */}
      <form ref={formRef} action={handleSubmit} className="mt-auto border-t border-border pt-3">
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="slug" value={slug} />
        <input
          name="body"
          required
          placeholder="Ask a question…"
          className="w-full rounded-full border border-border bg-bg px-4 py-2.5 text-small placeholder:text-text-secondary focus:outline-none focus:border-primary"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-caption text-text-secondary">
            <input type="checkbox" name="anonymous" value="1" /> Ask anonymously
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-primary px-4 py-1.5 text-small font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Sending…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
