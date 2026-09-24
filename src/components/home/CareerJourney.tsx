import Link from "next/link";
import { DEMO_JOURNEY } from "@/lib/home/journey";
import { SIGNUP } from "@/components/home/links";

/**
 * Demonstrates the product rather than describing it: one person, one goal,
 * and every step the Career Graph takes between the two.
 *
 * The data is an illustrative example and is labelled as such on the page.
 * See src/lib/home/journey.ts for how to swap it for live engine output.
 *
 * Layout note: eight steps in a flat list read as a wall. The rail markers
 * now carry brand colour and the step headline is the largest thing in each
 * row, so the sequence scans vertically instead of needing to be read.
 */
export function CareerJourney() {
  const j = DEMO_JOURNEY;

  return (
    <section id="journey" className="border-b border-border bg-white">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <span className="eyebrow text-caption text-text-secondary">
            Illustrative example
          </span>
          <h2 className="mt-3 text-h2 md:text-h1">
            {j.personaName} wants to become a {j.goal}.
          </h2>
          <p className="mt-5 text-lead text-text-secondary">
            She is a {j.currentRole} today. Here is every step ASCENDR takes between those
            two facts — and what she can act on at the end of it.
          </p>
        </div>

        <ol className="mt-16 space-y-0">
          {j.steps.map((step, i) => (
            <li key={step.id} className="relative pb-11 pl-14 last:pb-0">
              {i < j.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[17px] top-9 h-full w-px bg-gradient-to-b from-brand-200 to-border"
                />
              )}
              <span
                aria-hidden
                className="nums absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-small font-bold text-primary"
              >
                {i + 1}
              </span>

              <p className="eyebrow text-caption text-text-secondary">{step.label}</p>
              <p className="mt-2 text-h4 md:text-h3">{step.headline}</p>

              {step.items && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {step.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-caption font-medium text-text-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-8 md:p-10">
          <span className="eyebrow text-caption text-primary">Outcome</span>
          <p className="mt-3 text-h3 md:text-h2">{j.outcome}</p>
          <p className="mt-4 max-w-prose text-body text-text-secondary">
            Not a reading list. A set of actions with names attached — who to talk to, what
            to learn first, and which roles are already within reach.
          </p>
          <Link
            href={SIGNUP}
            className="mt-8 inline-block rounded-sm bg-primary px-7 py-3.5 text-[17px] font-semibold text-white shadow-lift transition-colors hover:bg-brand-600"
          >
            Build My Career Plan
          </Link>
        </div>
      </div>
    </section>
  );
}
