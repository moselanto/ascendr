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
    <section id="questions" className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <h2 className="max-w-2xl text-h2 font-bold md:text-h1">
          Your career has four questions.
        </h2>
        <p className="mt-4 max-w-2xl text-body text-text-secondary">
          Most platforms answer one of them. ASCENDR connects all four, so an answer to
          any one moves the others.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {QUESTIONS.map((q) => (
            <Link
              key={q.n}
              href={SIGNUP}
              className="group flex flex-col rounded-lg border border-border bg-bg p-7 transition-colors hover:border-primary"
            >
              <span className="text-caption font-bold tracking-widest text-text-secondary">
                {q.n}
              </span>
              <h3 className="mt-5 text-h3 font-bold">{q.question}</h3>
              <span className="mt-2 text-small font-semibold text-primary">{q.answer}</span>
              <p className="mt-4 text-small leading-relaxed text-text-secondary">{q.body}</p>
              <span className="mt-6 text-small font-semibold text-text group-hover:text-primary">
                Start here →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
