"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Coach = {
  id: string;
  name: string;
  tagline: string;
  initials: string;
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
    initials: "CC",
    greeting:
      "Hi, I'm your ASCENDR AI Career Coach. Tell me your goal (a role you're targeting, an interview coming up, or a skill you want to build) and I'll map out your next steps.",
  },
  {
    id: "switcher",
    name: "Career Switch Guide",
    tagline: "Move into a new field with confidence",
    initials: "CS",
    greeting:
      "Thinking about a career change? Tell me where you are now and where you'd like to go, and we'll build a realistic bridge between the two.",
  },
  {
    id: "negotiator",
    name: "Offer & Salary Coach",
    tagline: "Negotiate your worth, calmly",
    initials: "OS",
    greeting:
      "Got an offer or a review coming up? Share the details and I'll help you prepare a clear, confident case.",
  },
];

const NOT_CONFIGURED_PREFIX = "The AI isn't switched on yet";

function suggestionsFor(coachId: string, goal: string | null): string[] {
  const role = goal?.trim() || null;
  if (coachId === "switcher") {
    return role
      ? [
          `Which of my current skills transfer to ${role}?`,
          `Build me a 90-day bridge plan into ${role}`,
          `How do I explain my switch to ${role} in interviews?`,
        ]
      : [
          "Which of my skills transfer to a new field?",
          "Build me a 90-day career switch plan",
          "How do I explain a career change in interviews?",
        ];
  }
  if (coachId === "negotiator") {
    return role
      ? [
          `What salary range is fair for ${role}?`,
          `Help me counter an offer for a ${role} role`,
          "How do I ask for a raise at my next review?",
        ]
      : [
          "Help me counter my job offer",
          "How do I ask for a raise at my next review?",
          "What should I negotiate besides salary?",
        ];
  }
  return role
    ? [
        `What should I learn next to become ${role}?`,
        `Draft a 30-day plan toward ${role}`,
        `Prep me for my first ${role} interview`,
        "Review my weekly routine for job searching",
      ]
    : [
        "Help me choose a career goal",
        "What skills should I learn next?",
        "Draft a 30-day plan to land my next role",
        "Review my approach to interview prep",
      ];
}

function CoachAvatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ${
        size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-[12px]"
      }`}
    >
      {initials}
    </span>
  );
}

export default function AICoachesTab({
  goalTitle = null,
  configured = true,
}: {
  goalTitle?: string | null;
  configured?: boolean;
}) {
  const [active, setActive] = useState<Coach>(COACHES[0]);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: COACHES[0].greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(!configured);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
      const reply: string = data.reply || data.error || "…";
      if (typeof data.reply === "string" && data.reply.startsWith(NOT_CONFIGURED_PREFIX)) {
        setNotConfigured(true);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong reaching the coach. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = suggestionsFor(active.id, goalTitle);

  return (
    <div className="grid gap-5 md:grid-cols-[260px_1fr]">
      {/* Coach picker */}
      <div className="flex h-fit flex-col gap-3">
        <p className="px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
          Your coaches
        </p>
        <div className="rounded-2xl border border-border bg-white p-0 shadow-card">
          <div className="divide-y divide-border">
            {COACHES.map((c) => (
              <button
                key={c.id}
                onClick={() => switchCoach(c)}
                className={`flex w-full items-center gap-3 px-5 py-4 text-left first:rounded-t-2xl last:rounded-b-2xl ${
                  active.id === c.id ? "bg-surface" : "hover:bg-surface"
                }`}
              >
                <CoachAvatar initials={c.initials} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-ink">{c.name}</span>
                  <span className="block truncate text-[12px] text-text-secondary">{c.tagline}</span>
                </span>
                {active.id === c.id && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-accent" />}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-white p-5 text-[13px] text-text-secondary">
          <p className="font-semibold text-ink">Mentor clones</p>
          <p className="mt-1">
            Mentor clones live inside each community. A mentor trains an AI on their own content and it
            answers members with cited sources.
          </p>
          <Link href="/app/communities" className="mt-3 inline-block text-[13px] font-medium text-ink hover:text-brand-700">
            Browse communities →
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <p className="text-[12px] font-medium text-text-secondary">Coaching toward</p>
          {goalTitle ? (
            <p className="mt-1 text-[14px] font-semibold text-ink">{goalTitle}</p>
          ) : (
            <p className="mt-1 text-[13px] text-text-secondary">No career goal set yet.</p>
          )}
          <Link href="/onboarding" className="mt-3 inline-block text-[13px] font-medium text-ink hover:text-brand-700">
            {goalTitle ? "Update goal →" : "Set a goal →"}
          </Link>
        </div>
      </div>

      {/* Chat */}
      <div className="flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center gap-3 border-b border-border bg-white px-5 py-4">
          <CoachAvatar initials={active.initials} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-semibold text-ink">{active.name}</span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">AI</span>
            </div>
            <div className="truncate text-[12px] text-text-secondary">{active.tagline}</div>
          </div>
          {notConfigured ? (
            <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              Not configured
            </span>
          ) : (
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[12px] text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-accent" /> Online
            </span>
          )}
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {notConfigured && (
            <div className="rounded-2xl border border-dashed border-border bg-white p-6 text-center">
              <p className="text-[15px] font-semibold text-ink">The AI coach is not configured</p>
              <p className="mt-1 text-[14px] text-text-secondary">
                An administrator needs to add an OPENAI_API_KEY before the coach can give live answers. You
                can still explore the other tools.
              </p>
              <Link
                href="/app/ai?tab=plan"
                className="mt-4 inline-block rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40"
              >
                Open career plan →
              </Link>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="max-w-[80%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14px] text-white"
              >
                {m.content}
              </div>
            ) : (
              <div key={i} className="flex max-w-[88%] items-start gap-2.5 self-start">
                <CoachAvatar initials={active.initials} size="sm" />
                <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3 text-[14px] leading-relaxed text-ink shadow-card">
                  {m.content}
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex items-start gap-2.5 self-start">
              <CoachAvatar initials={active.initials} size="sm" />
              <div className="rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3 text-[14px] text-text-secondary shadow-card">
                <span className="animate-pulse">Thinking…</span>
              </div>
            </div>
          )}
          {messages.length <= 1 && !loading && (
            <div className="mt-1 flex flex-wrap gap-2">
              {suggestions.map((s) => (
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
            placeholder={`Ask ${active.name}…`}
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
    </div>
  );
}
