"use client";

import { useState } from "react";

type Turn = { question: string; answer: string; feedback: string; rating: number };
type Kind = "behavioral" | "technical" | "mixed";

const KINDS: { key: Kind; label: string }[] = [
  { key: "behavioral", label: "Behavioral" },
  { key: "technical", label: "Technical" },
  { key: "mixed", label: "Mixed" },
];

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[12px] tracking-[0.05em]" aria-label={`${n} out of 5`}>
      <span className="text-ink">{"★".repeat(Math.max(0, Math.min(5, n)))}</span>
      <span className="text-border">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

export default function InterviewPrepTab() {
  const [role, setRole] = useState("");
  const [kind, setKind] = useState<Kind>("behavioral");
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function nextQuestion(currentTurns: Turn[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "question",
          role,
          kind,
          asked: currentTurns.map((t) => t.question),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not get a question");
      setQuestion(data.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    if (!role.trim()) return;
    setStarted(true);
    setTurns([]);
    await nextQuestion([]);
  }

  async function submitAnswer() {
    if (!answer.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feedback", role, kind, question, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not get feedback");
      const turn: Turn = { question, answer, feedback: data.feedback, rating: data.rating ?? 3 };
      const updated = [...turns, turn];
      setTurns(updated);
      setAnswer("");
      setQuestion("");
      await nextQuestion(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const avg = turns.length
    ? Math.round((turns.reduce((s, t) => s + t.rating, 0) / turns.length) * 10) / 10
    : 0;

  if (!started) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Mock interview</p>
        <h2 className="mt-1 text-[18px] font-semibold text-ink">Rehearse with instant feedback</h2>
        <p className="mt-1 text-[14px] text-text-secondary">
          Pick a role and type. You&apos;ll get one question at a time and specific feedback after each answer.
        </p>
        <label htmlFor="iv-role" className="mt-5 block text-[12px] font-medium text-text-secondary">
          Role you&apos;re practicing for
        </label>
        <input
          id="iv-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Product Manager, Frontend Engineer"
          className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
        />
        <p className="mt-4 text-[12px] font-medium text-text-secondary">Interview type</p>
        <div className="mt-1.5 flex gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                kind === k.key
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-white text-text-secondary hover:border-ink/40"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <button
          onClick={start}
          disabled={!role.trim()}
          className="mt-6 w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50"
        >
          Begin interview →
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* Current question + answer */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold capitalize text-brand-700">
            {kind} · {role}
          </span>
          <span className="shrink-0 text-[12px] text-text-secondary">Question {turns.length + 1}</span>
        </div>

        <div className="mt-4 rounded-xl bg-surface px-4 py-4 text-[16px] font-medium text-ink">
          {loading && !question ? (
            <span className="animate-pulse text-text-secondary">Thinking of a good question…</span>
          ) : (
            question
          )}
        </div>

        <label htmlFor="iv-answer" className="mt-4 block text-[12px] font-medium text-text-secondary">
          Your answer
        </label>
        <textarea
          id="iv-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={7}
          placeholder="Type your answer as if you were speaking to the interviewer…"
          className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={submitAnswer}
            disabled={!answer.trim() || loading}
            className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50"
          >
            {loading ? "Scoring…" : "Submit answer"}
          </button>
          <button
            onClick={() => nextQuestion(turns)}
            disabled={loading}
            className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40 disabled:opacity-50"
          >
            Skip question
          </button>
          <button
            onClick={() => setStarted(false)}
            className="ml-auto text-[13px] font-medium text-text-secondary hover:text-danger"
          >
            End session
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </div>

      {/* Feedback history */}
      <div className="h-fit rounded-2xl border border-border bg-white p-0 shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Feedback</span>
          {turns.length > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] text-text-secondary">
              Avg <Stars n={Math.round(avg)} /> {avg}
            </span>
          )}
        </div>
        {turns.length === 0 ? (
          <p className="px-5 py-4 text-[14px] text-text-secondary">
            Answer the question and your feedback will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {[...turns].reverse().map((t, i) => (
              <li key={i} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-text-secondary">Q{turns.length - i}</span>
                  <Stars n={t.rating} />
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-text-secondary">{t.question}</p>
                <p className="mt-1.5 text-[14px] text-ink">{t.feedback}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
