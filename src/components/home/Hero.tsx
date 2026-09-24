import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

/**
 * Homepage hero — outcome-led rather than feature-led.
 *
 * Note on the trust strip: the previous hero carried "Trusted by learners in
 * 40+ countries" and a 40+/24/7/100% statistics bar. Both were placeholder
 * figures presented as fact on a public page, so they are gone. Nothing
 * replaces them until there are real numbers to state. The capability row at
 * the bottom describes what the product does, which is verifiable, rather
 * than claiming adoption we cannot evidence.
 *
 * Layout note: the previous hero had ~180px of empty space below the CTA
 * because the section padding and the gradient block were set independently.
 * Spacing is now driven by one rhythm.
 */

const CAPABILITIES = [
  "Skills gap analysis",
  "Mentor matching",
  "Community network",
  "Opportunity fit",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Brand tint, not saturated brand: a full-strength wash behind text
          vibrates against the headline. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-brand-50 via-brand-50/40 to-white" />

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-20 text-center md:pb-24 md:pt-28">
        <span className="eyebrow inline-block rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-caption text-primary shadow-sm">
          Career Intelligence
        </span>

        <h1 className="mx-auto mt-7 max-w-4xl text-h1 md:text-display">
          Your Network. Your Skills.
          <br className="hidden sm:block" />{" "}
          <span className="text-primary">Your Next Opportunity.</span>
        </h1>

        {/* Measure capped near 60 characters — the old hero ran the lead the
            full width of the container, which is why it read as dense. */}
        <p className="mx-auto mt-6 max-w-2xl text-lead text-text-secondary">
          ASCENDR connects your goals, skills, mentors and professional network, then
          turns them into a plan you can act on — so career ambition becomes measurable
          progress.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={SIGNUP}
            className="w-full rounded-sm bg-primary px-7 py-3.5 text-[17px] font-semibold text-white shadow-lift transition-colors hover:bg-brand-600 sm:w-auto"
          >
            Build My Career Plan
          </Link>
          <a
            href="#journey"
            className="w-full rounded-sm border border-border bg-white px-7 py-3.5 text-[17px] font-semibold text-text transition-colors hover:border-primary hover:text-primary sm:w-auto"
          >
            See how it works
          </a>
        </div>

        <p className="mt-4 text-small text-text-secondary">
          Free to start · No credit card required
        </p>

        <ul className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-3 border-t border-border pt-7 text-small font-medium text-text-secondary">
          {CAPABILITIES.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
