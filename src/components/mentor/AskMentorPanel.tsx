"use client";

import { useState } from "react";

type Citation = { source_title: string; chunk_index: number; similarity: number };
type Turn = { role: "user" | "assistant"; content: string; citations?: Citation[]; grounded?: boolean };

const SUGGESTIONS = [
  "What's your advice for someone just starting out?",
  "How should I prepare for an interview?",
  "What mistakes do people make early in their career?",
];

export function AskMentorPanel({
  communityId,
  mentorName,
}: {
  communityId: string;
  mentorName: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/mentor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: communityId, mentor_name: mentorName, question: q }),
      });
      const data = await res.json();
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: data.answer || data.error || "No answer.",
          citations: data.citations,
          grounded: data.grounded,
        },
      ]);
    } catch {
      setTurns((t) => [...t, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white">
      <div className="border-b border-[#E2E8F0] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">Ask {mentorName}&apos;s AI</h3>
        <p className="text-xs text-[#64748B]">
          Grounded in {mentorName}&apos;s own content. Answers cite their sources.
        </p>
      </div>

      <div className="max-h-[360px] space-y-4 overflow-y-auto px-4 py-4">
        {turns.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-[#64748B]">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-left text-sm text-[#0F172A] hover:border-[#4F46E5]"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "text-right" : "text-left"}>
              <div
                className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  t.role === "user"
                    ? "bg-[#4F46E5] text-white"
                    : "bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0]"
                }`}
              >
                <p className="whitespace-pre-wrap">{t.content}</p>
                {t.role === "assistant" && t.citations && t.citations.length > 0 && (
                  <div className="mt-2 border-t border-[#E2E8F0] pt-2">
                    <p className="text-xs font-medium text-[#64748B]">Sources</p>
                    <ul className="mt-1 space-y-0.5">
                      {t.citations.map((c, idx) => (
                        <li key={idx} className="text-xs text-[#64748B]">
                          [{idx + 1}] {c.source_title} · part {c.chunk_index + 1}{" "}
                          <span className="text-[#10B981]">{Math.round(c.similarity * 100)}% match</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.role === "assistant" && t.grounded === false && (
                  <a
                    href="?ask_mentor=1"
                    className="mt-2 inline-block rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Ask the real {mentorName}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
        {busy && <p className="text-sm text-[#64748B]">{mentorName}&apos;s AI is thinking…</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 border-t border-[#E2E8F0] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${mentorName}'s AI…`}
          className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
