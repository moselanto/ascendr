import Link from "next/link";
import { DEMO_JOURNEY } from "@/lib/home/journey";
import { SIGNUP } from "@/components/home/links";

/**
 * Demonstrates the product rather than describing it: one person, one goal,
 * and every step the Career Graph takes between the two.
 *
 * The data is an illustrative example and is labelled as such on the page.
 * See src/lib/home/journey.ts for how to swap it for live engine output.
 */
export function CareerJourney() {
  const j = DEMO_JOURNEY;

  return (
    <section id="journey" className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-24">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-card px-3 py-1 font-display text-caption font-semibold uppercase tracking-wide text-text-secondary ring-1 ring-border">
            Illustrative example
          </span>
        </div>

        <h2 className="mt-6 max-w-3xl font-display text-h2 md:text-h1">
          {j.personaName} wants to become a {j.goal}.
        </h2>
        <p className="mt-4 max-w-2xl text-body text-text-secondary">
          She is a {j.currentRole} today. Here is every step ASCENDR takes between those
          two facts — and what she can act on at the end of it.
        </p>

        <ol className="mt-14 space-y-0">
          {j.steps.map((step, i) => (
            <li key={step.id} className="relative pl-10 pb-10 last:pb-0">
              {/* connector */}
              {i < j.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[11px] top-7 h-full w-px bg-border"
                />
              )}
              {/* Step numbers use Manrope with tabular figures so the markers
                  stay on one optical axis down the rail. */}
              <span
                aria-hidden
                className="nums absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-caption font-bold text-primary"
              >
                {i + 1}
              </span>

              <p className="font-display text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {step.label}
              </p>
              <p className="mt-1.5 font-display text-h4 leading-snug md:text-h3">
                {step.headline}
              </p>

              {step.items && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-card px-3 py-1 text-caption font-medium text-text-secondary ring-1 ring-border"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-7">
          <p className="font-display text-caption font-semibold uppercase tracking-wide text-primary">
            Outcome
          </p>
          <p className="mt-2 font-display text-h3">{j.outcome}</p>
          <p className="mt-3 max-w-xl text-small text-text-secondary">
            Not a reading list. A set of actions with names attached — who to talk to, what
            to learn first, and which roles are already within reach.
          </p>
          <Link
            href={SIGNUP}
            className="mt-6 inline-block rounded-sm bg-primary px-6 py-3 font-display text-body font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Build My Career Plan
          </Link>
        </div>
      </div>
    </section>
  );
}
