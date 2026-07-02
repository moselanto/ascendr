"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Coach = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  system: string;
  greeting: string;
};

// Preset coaches. Each is the AI Career Coach specialized with a persona.
// "Mentor clones" (RAG-grounded) live inside a community; here we offer the
// general coach plus focused personas that meet a professional bar.
const COACHES: Coach[] = [
  {
    id: "coach",
    name: "AI Career Coach",
    tagline: "Practical, encouraging, specific",
    accent: "from-accent to-[#059669]",
    system: "coach",
    greeting:
      "Hi! I'm your ASCENDR AI Career Coach. Tell me your goal — a role you're targeting, an interview coming up, or a skill you want to build — and I'll map out your next steps.",
  },
  {
    id: "switcher",
    name: "Career Switch Guide",
    tagline: "Move into a new field with confidence",
    accent: "from-primary to-[#6366f1]",
    system: "coach",
    greeting:
      "Thinking about a career change? Tell me where you are now and where you'd like to go, and we'll build a realistic bridge between the two.",
  },
  {
    id: "negotiator",
    name: "Offer & Salary Coach",
    tagline: "Negotiate your worth, calmly",
    accent: "from-[#f59e0b] to-[#d97706]",
    system: "coach",
    greeting:
      "Got an offer or a review coming up? Share the details and I'll help you prepare a clear, confident case.",
  },
];

export default function AICoachesTab() {
  const [active, setActive] = useState<Coach>(COACHES[0]);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: COACHES[0].greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  function switchCoach(c: Coach) {
    setActive(c);
    setMessages([{ role: "assistant", content: c.greeting }]);
    setInput("");
  }

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
        body: JSON.stringify({ messages: next, persona: active.id }),
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
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      {/* Coach picker */}
      <div className="flex h-fit flex-col gap-2">
        <div className="text-caption font-bold uppercase tracking-wide text-text-secondary px-1">
          Your coaches
        </div>
        {COACHES.map((c) => (
          <button
            key={c.id}
            onClick={() => switchCoach(c)}
            className={`flex items-center gap-3 rounded-md border p-3 text-left ${
              active.id === c.id ? "border-primary bg-[#eef2ff]" : "border-border bg-card hover:border-primary"
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${c.accent} text-white text-caption font-bold`}>
              ✦
            </span>
            <span>
              <span className="block text-small font-semibold">{c.name}</span>
              <span className="block text-caption text-text-secondary">{c.tagline}</span>
            </span>
          </button>
        ))}

        <div className="mt-2 rounded-md border border-dashed border-border bg-card p-3 text-caption text-text-secondary">
          <span className="font-semibold text-text-primary">Mentor Clones</span> live inside each
          community — a mentor trains an AI on their own content, and it answers members with cited
          sources. Open a community&apos;s Mentor Workspace to build one.
        </div>
      </div>

      {/* Chat */}
      <div className="flex h-[62vh] flex-col rounded-md border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${active.accent} text-white text-caption font-bold`}>
            ✦
          </div>
          <div>
            <div className="font-semibold text-small">
              {active.name}
              <span className="ml-1 rounded-full bg-[#eef2ff] px-2 py-0.5 text-caption font-semibold text-primary">AI</span>
            </div>
            <div className="text-caption text-text-secondary">{active.tagline}</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-5">
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
            <div className="self-start rounded-[14px_14px_14px_4px] border border-border bg-bg px-4 py-2.5 text-small italic text-text-secondary">
              Coach is thinking…
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
            placeholder={`Ask ${active.name}…`}
            className="flex-1 rounded-sm border border-border px-4 py-2.5 text-body outline-none focus:border-primary"
          />
          <button
            disabled={loading}
            className="rounded-sm bg-primary px-5 py-2.5 text-small font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
