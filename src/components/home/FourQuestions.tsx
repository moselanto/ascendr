import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

const QUESTIONS = [
  {
    n: "01",
    question: "What should I learn?",
    answer: "Career Intelligence",
    body: "Your goal, measured against what the role actually requires — so the gap is a list, not a feeling.",
  },
  {
    n: "02",
    question: "Who should I learn from?",
    answer: "Mentors & Experts",
    body: "People who already hold the role you want, matched on your gaps and reachable in your communities.",
  },
  {
    n: "03",
    question: "Who should I connect with?",
    answer: "Professional Network",
    body: "The members you already share a room with — and which of them have made the move you are making.",
  },
  {
    n: "04",
    question: "Where can I go next?",
    answer: "Opportunity Intelligence",
    body: "Roles scored against your skills, with the one thing standing between you and a stronger match.",
  },
];

export function FourQuestions() {
  return (
    <section id="questions" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <span className="eyebrow text-caption text-primary">Why ASCENDR</span>
          <h2 className="mt-3 text-h2 md:text-h1">Your career has four questions.</h2>
          <p className="mt-5 text-lead text-text-secondary">
            Most platforms answer one of them. ASCENDR connects all four, so an answer to
            any one moves the others.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {QUESTIONS.map((q) => (
            <Link
              key={q.n}
              href={SIGNUP}
              className="group flex flex-col rounded-lg border border-border bg-white p-8 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
            >
              <div className="flex items-center gap-3">
                <span className="nums text-caption font-bold tracking-widest text-brand-400">
                  {q.n}
                </span>
                <span className="h-px flex-1 bg-border transition-colors group-hover:bg-brand-200" />
              </div>

              <h3 className="mt-6 text-h3 text-text">{q.question}</h3>
              <span className="mt-2 text-small font-semibold text-primary">{q.answer}</span>
              <p className="mt-4 text-small leading-relaxed text-text-secondary">{q.body}</p>

              <span className="mt-7 inline-flex items-center gap-1.5 text-small font-semibold text-text transition-colors group-hover:text-primary">
                Start here
                <span
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
