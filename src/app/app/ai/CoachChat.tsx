"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Help me plan a switch into product management",
  "Review my approach to interview prep",
  "What skills should I learn next for a PM role?",
  "Draft a 30-day plan to land my first tech job",
];

export default function CoachChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your ASCENDR AI Career Coach. Tell me your goal — a role you're targeting, an interview coming up, or a skill you want to build — and I'll map out your next steps.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "…" }]);
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
    <div className="rounded-md border border-border bg-card flex flex-col h-[70vh]">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#059669] text-white text-caption font-bold">
          ✦
        </div>
        <div>
          <div className="font-semibold text-small">
            AI Career Coach <span className="ml-1 rounded-full bg-[#eef2ff] px-2 py-0.5 text-caption font-semibold text-primary">AI</span>
          </div>
          <div className="text-caption text-text-secondary">Practical, encouraging, specific.</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "self-end max-w-[80%] rounded-[14px_14px_4px_14px] bg-primary px-4 py-2.5 text-small text-white whitespace-pre-wrap"
                : "self-start max-w-[85%] rounded-[14px_14px_14px_4px] bg-bg border border-border px-4 py-2.5 text-small whitespace-pre-wrap"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="self-start rounded-[14px_14px_14px_4px] bg-bg border border-border px-4 py-2.5 text-small text-text-secondary italic">
            Coach is thinking…
          </div>
        )}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border px-3 py-1.5 text-caption text-text-secondary hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-border p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach anything…"
          className="flex-1 rounded-sm border border-border px-4 py-2.5 text-body"
        />
        <button
          disabled={loading}
          className="rounded-sm bg-primary px-5 py-2.5 text-small font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
