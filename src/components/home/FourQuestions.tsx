import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

type Q = { n: string; question: string; answer: string; body: string; icon: JSX.Element };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const QUESTIONS: Q[] = [
  {
    n: "01",
    question: "What should I learn?",
    answer: "Career Intelligence",
    body: "Your goal, measured against what the role actually requires, so the gap is a list, not a feeling.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
        <path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" />
      </svg>
    ),
  },
  {
    n: "02",
    question: "Who should I learn from?",
    answer: "Mentors & Experts",
    body: "People who already hold the role you want, matched on your gaps and reachable in your communities.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
      </svg>
    ),
  },
  {
    n: "03",
    question: "Who should I connect with?",
    answer: "Professional Network",
    body: "The members you already share a room with, and which of them have made the move you are making.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
        <circle cx="6" cy="7" r="2.5" />
        <circle cx="18" cy="7" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="M8 8.5l3 7.5M16 8.5l-3 7.5M8.5 7h7" />
      </svg>
    ),
  },
  {
    n: "04",
    question: "Where can I go next?",
    answer: "Opportunity Intelligence",
    body: "Roles scored against your skills, with the one thing standing between you and a stronger match.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
        <path d="M5 19L19 5M19 5h-8M19 5v8" />
      </svg>
    ),
  },
];

export function FourQuestions() {
  return (
    <section id="questions" className="bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="text-[14px] font-medium text-brand-600">Why ASCENDR</p>
            <h2 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[44px]">
              Your career has <br className="hidden sm:block" /><span className="accent-serif">four questions.</span>
            </h2>
          </div>
          <p className="max-w-md text-lead text-text-secondary lg:justify-self-end">
            Most platforms answer one of them. ASCENDR connects all four, so progress on any
            one moves the others.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-2">
          {QUESTIONS.map((q) => (
            <Link
              key={q.n}
              href={SIGNUP}
              className="group flex flex-col bg-white p-7 transition-colors hover:bg-brand-50/40 md:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink/10 text-ink transition-colors group-hover:border-brand-300 group-hover:text-brand-600">
                  {q.icon}
                </span>
                <span className="nums text-[13px] text-text-secondary">{q.n}</span>
              </div>

              <p className="mt-8 text-[13px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                {q.answer}
              </p>
              <h3 className="mt-2 text-[23px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                {q.question}
              </h3>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-text-secondary">{q.body}</p>

              <span className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-ink">
                Start here
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
