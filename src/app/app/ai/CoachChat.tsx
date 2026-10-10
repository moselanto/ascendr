"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Help me plan a switch into product management",
  "Review my approach to interview prep",
  "What skills should I learn next for a PM role?",
  "Draft a 30-day plan to land my first tech job",
];

const NOT_CONFIGURED_PREFIX = "The AI isn't switched on yet";

export default function CoachChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm your ASCENDR AI Career Coach. Tell me your goal (a role you're targeting, an interview coming up, or a skill you want to build) and I'll map out your next steps.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (typeof data.reply === "string" && data.reply.startsWith(NOT_CONFIGURED_PREFIX)) {
        setNotConfigured(true);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || data.error || "…" }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong reaching the coach. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-3 border-b border-border bg-white px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
          CC
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">AI Career Coach</span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">AI</span>
          </div>
          <div className="text-[12px] text-text-secondary">Practical, encouraging, specific.</div>
        </div>
        {notConfigured && (
          <span className="ml-auto rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            Not configured
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[80%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14px] text-white"
                : "max-w-[85%] self-start whitespace-pre-wrap rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3 text-[14px] leading-relaxed text-ink shadow-card"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="self-start rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3 text-[14px] text-text-secondary shadow-card">
            <span className="animate-pulse">Thinking…</span>
          </div>
        )}
        {messages.length <= 1 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-[13px] text-ink hover:border-ink/40"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border bg-white p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach anything…"
          className="flex-1 rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50"
        >
          Send →
        </button>
      </form>
    </div>
  );
}
