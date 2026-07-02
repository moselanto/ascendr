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
    <span className="text-caption" aria-label={`${n} out of 5`}>
      <span className="text-[#f59e0b]">{"★".repeat(n)}</span>
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
      <div className="mx-auto max-w-lg rounded-md border border-border bg-card p-6">
        <h3 className="font-semibold">Start a mock interview</h3>
        <p className="mt-1 text-small text-text-secondary">
          Pick a role and type. I&apos;ll ask one question at a time and give specific feedback after each answer.
        </p>
        <label className="mt-4 block text-small font-semibold">Role you&apos;re practicing for</label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Product Manager, Frontend Engineer"
          className="mt-1 w-full rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
        />
        <label className="mt-4 block text-small font-semibold">Interview type</label>
        <div className="mt-1 flex gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={`rounded-full border px-3 py-1 text-caption font-semibold ${
                kind === k.key ? "border-primary bg-[#eef2ff] text-primary" : "border-border text-text-secondary"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <button
          onClick={start}
          disabled={!role.trim()}
          className="mt-5 w-full rounded-sm bg-primary px-4 py-2.5 text-small font-semibold text-white disabled:opacity-50"
        >
          Begin interview
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Current question + answer */}
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-caption font-semibold capitalize text-primary">
            {kind} · {role}
          </span>
          <span className="text-caption text-text-secondary">Question {turns.length + 1}</span>
        </div>

        <div className="mt-4 rounded-md bg-bg px-4 py-3 text-body font-semibold">
          {loading && !question ? "Thinking of a good question…" : question}
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={7}
          placeholder="Type your answer as if you were speaking to the interviewer…"
          className="mt-3 w-full rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={submitAnswer}
            disabled={!answer.trim() || loading}
            className="rounded-sm bg-primary px-4 py-2.5 text-small font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Scoring…" : "Submit answer"}
          </button>
          <button
            onClick={() => nextQuestion(turns)}
            disabled={loading}
            className="text-small font-semibold text-text-secondary hover:text-primary"
          >
            Skip question
          </button>
          <button
            onClick={() => setStarted(false)}
            className="ml-auto text-small font-semibold text-text-secondary hover:text-danger"
          >
            End
          </button>
        </div>
        {error && <p className="mt-2 text-caption text-danger">{error}</p>}
      </div>

      {/* Feedback history */}
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-caption font-bold uppercase tracking-wide text-text-secondary">
            Feedback
          </span>
          {turns.length > 0 && (
            <span className="text-caption text-text-secondary">
              Avg <Stars n={Math.round(avg)} /> {avg}
            </span>
          )}
        </div>
        {turns.length === 0 ? (
          <p className="mt-3 text-small text-text-secondary">
            Answer the question and your feedback will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {[...turns].reverse().map((t, i) => (
              <li key={i} className="rounded-md border border-border bg-bg px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-semibold text-text-secondary">
                    Q{turns.length - i}
                  </span>
                  <Stars n={t.rating} />
                </div>
                <p className="mt-1 text-caption text-text-secondary line-clamp-2">{t.question}</p>
                <p className="mt-1.5 text-small">{t.feedback}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
