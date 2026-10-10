import Link from "next/link";
import { DEMO_JOURNEY } from "@/lib/home/journey";
import { SIGNUP } from "@/components/home/links";

/**
 * Demonstrates the product rather than describing it: one person, one goal,
 * and every step the Career Graph takes between the two.
 *
 * Two columns on desktop: the story and outcome stay pinned on the left while
 * the steps scroll on the right. The data is illustrative and labelled as such.
 * See src/lib/home/journey.ts for how to swap it for live engine output.
 */
export function CareerJourney() {
  const j = DEMO_JOURNEY;

  return (
    <section id="journey" className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:py-20 lg:gap-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[14px] font-medium text-brand-600">How it works · illustrative example</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[44px]">
            {j.personaName} wants to become a <span className="accent-serif">{j.goal}.</span>
          </h2>
          <p className="mt-6 max-w-md text-lead text-text-secondary">
            She is a {j.currentRole} today. Here is every step ASCENDR takes between those two
            facts, and what she can act on at the end of it.
          </p>

          <div className="mt-8 rounded-2xl bg-ink p-7 text-white">
            <p className="text-[13px] uppercase tracking-[0.12em] text-white/55">Outcome</p>
            <p className="mt-2 text-[24px] font-semibold tracking-tight">{j.outcome}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              Not a reading list. A set of actions with names attached: who to talk to, what to
              learn first, and which roles are already within reach.
            </p>
            <Link
              href={SIGNUP}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-brand-50"
            >
              Build my career plan <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <ol className="relative">
          <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px bg-ink/10" />
          {j.steps.map((step, i) => (
            <li key={step.id} className="relative flex gap-6 pb-4 last:pb-0">
              <span className="nums relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white text-[14px] font-semibold text-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 rounded-xl border border-ink/[0.08] bg-white px-5 py-4 transition-shadow hover:shadow-card">
                <p className="text-[13px] text-text-secondary">{step.label}</p>
                <p className="mt-1 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink">
                  {step.headline}
                </p>
                {step.items && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {step.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-xl bg-surface px-2.5 py-1 text-[13px] text-text-secondary"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
