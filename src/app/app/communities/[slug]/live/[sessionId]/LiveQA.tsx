"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  askQuestion,
  toggleQuestionVote,
  setQuestionStatus,
} from "../../../live-actions";

type Question = {
  id: string;
  body: string;
  votes: number;
  status: string;
  anonymous: boolean;
  author_id: string;
  author_name: string;
  voted: boolean;
};

const STATUS_PILL: Record<string, string> = {
  answered: "bg-[#ecfdf5] text-[#047857]",
  pinned: "bg-[#fef3c7] text-[#92400e]",
};

export default function LiveQA({
  sessionId,
  communityId,
  slug,
  meId,
  isMod,
  initialQuestions,
}: {
  sessionId: string;
  communityId: string;
  slug: string;
  meId: string;
  isMod: boolean;
  initialQuestions: Question[];
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [, startTransition] = useTransition();

  // Realtime: refetch the board whenever questions or votes change for this session.
  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { data } = await supabase
        .from("live_questions")
        .select("id, body, votes, status, anonymous, author_id, profiles:author_id(full_name)")
        .eq("session_id", sessionId)
        .order("votes", { ascending: false })
        .order("created_at", { ascending: true });
      if (!data) return;

      const ids = data.map((q) => q.id);
      const votedSet = new Set<string>();
      if (ids.length) {
        const { data: myVotes } = await supabase
          .from("question_votes")
          .select("question_id")
          .eq("user_id", meId)
          .in("question_id", ids);
        (myVotes ?? []).forEach((v) => votedSet.add(v.question_id));
      }

      setQuestions(
        data.map((q) => ({
          id: q.id,
          body: q.body,
          votes: q.votes ?? 0,
          status: q.status,
          anonymous: q.anonymous,
          author_id: q.author_id,
          // @ts-expect-error supabase join shape
          author_name: q.profiles?.full_name ?? "Member",
          voted: votedSet.has(q.id),
        }))
      );
    }

    const channel = supabase
      .channel(`live-qa-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_questions", filter: `session_id=eq.${sessionId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "question_votes" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, meId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const fd = new FormData();
    fd.append("session_id", sessionId);
    fd.append("community_id", communityId);
    fd.append("slug", slug);
    fd.append("body", body);
    if (anonymous) fd.append("anonymous", "on");
    setBody("");
    setAnonymous(false);
    startTransition(() => {
      askQuestion(fd);
    });
  }

  function vote(q: Question) {
    // Optimistic update; realtime/refresh will reconcile.
    setQuestions((prev) =>
      prev.map((x) =>
        x.id === q.id ? { ...x, voted: !x.voted, votes: x.votes + (x.voted ? -1 : 1) } : x
      )
    );
    startTransition(() => {
      toggleQuestionVote(q.id, sessionId, slug);
    });
  }

  function mark(q: Question, status: string) {
    const fd = new FormData();
    fd.append("question_id", q.id);
    fd.append("session_id", sessionId);
    fd.append("community_id", communityId);
    fd.append("slug", slug);
    fd.append("status", status);
    startTransition(() => {
      setQuestionStatus(fd);
    });
  }

  // Pinned first, then by votes (server already ordered, but keep pinned on top client-side).
  const ordered = [...questions].sort((a, b) => {
    if (a.status === "pinned" && b.status !== "pinned") return -1;
    if (b.status === "pinned" && a.status !== "pinned") return 1;
    return b.votes - a.votes;
  });

  return (
    <div className="mt-5">
      <h2 className="mb-3 text-small font-bold uppercase tracking-wide text-text-secondary">
        Q&amp;A · {questions.length} {questions.length === 1 ? "question" : "questions"}
      </h2>

      <form onSubmit={submit} className="rounded-md border border-border bg-card p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Ask the mentor a question…"
          className="w-full rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={!body.trim()}
            className="rounded-sm bg-primary px-4 py-2 text-small font-semibold text-white disabled:opacity-50"
          >
            Ask (+5 XP)
          </button>
          <label className="flex items-center gap-1.5 text-caption text-text-secondary">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Ask anonymously
          </label>
        </div>
      </form>

      <ul className="mt-4 space-y-2">
        {ordered.length === 0 && (
          <li className="text-small text-text-secondary">No questions yet — be the first to ask.</li>
        )}
        {ordered.map((q) => (
          <li
            key={q.id}
            className={`flex gap-3 rounded-md border bg-card px-4 py-3 ${
              q.status === "pinned" ? "border-[#f59e0b]" : "border-border"
            }`}
          >
            <button
              onClick={() => vote(q)}
              className={`flex flex-col items-center rounded-sm border px-2.5 py-1 text-caption font-bold ${
                q.voted ? "border-primary bg-[#eef2ff] text-primary" : "border-border text-text-secondary"
              }`}
              aria-pressed={q.voted}
            >
              ▲<span>{q.votes}</span>
            </button>
            <div className="flex-1">
              <p className={`text-small ${q.status === "answered" ? "text-text-secondary line-through" : ""}`}>
                {q.body}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-caption text-text-secondary">
                  {q.anonymous ? "Anonymous" : q.author_name}
                </span>
                {q.status !== "open" && (
                  <span className={`rounded-full px-2 py-0.5 text-caption font-semibold capitalize ${STATUS_PILL[q.status] ?? ""}`}>
                    {q.status}
                  </span>
                )}
              </div>
              {isMod && (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => mark(q, q.status === "answered" ? "open" : "answered")} className="text-caption font-semibold text-primary">
                    {q.status === "answered" ? "Reopen" : "Mark answered"}
                  </button>
                  <button onClick={() => mark(q, q.status === "pinned" ? "open" : "pinned")} className="text-caption font-semibold text-[#92400e]">
                    {q.status === "pinned" ? "Unpin" : "Pin"}
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
