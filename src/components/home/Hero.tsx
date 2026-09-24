import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

/**
 * Homepage hero — outcome-led rather than feature-led.
 *
 * Note on the trust strip: the previous hero carried "Trusted by learners in
 * 40+ countries" and a 40+/24/7/100% statistics bar. Both were placeholder
 * figures presented as fact on a public page, so they are gone. Nothing
 * replaces them until there are real numbers to state.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Brand tint, not saturated brand. A full-strength #4000F9 wash behind
          text vibrates against the headline; brand-50 carries the hue without
          competing. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50 to-bg" />

      <div className="relative mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
        <span className="inline-block rounded-full bg-card px-3 py-1 font-display text-caption font-semibold uppercase tracking-wide text-primary shadow-sm ring-1 ring-border">
          Career Intelligence
        </span>

        <h1 className="mt-6 font-display text-h1 leading-tight md:text-display">
          Your Network. Your Skills.
          <br className="hidden sm:block" />{" "}
          <span className="text-primary">Your Next Opportunity.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-body text-text-secondary">
          ASCENDR is an AI-powered career intelligence platform that connects your goals,
          skills, mentors, professional network and opportunities — helping you turn career
          ambition into measurable progress.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={SIGNUP}
            className="w-full rounded-sm bg-primary px-7 py-3.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-600 sm:w-auto"
          >
            Build My Career Plan
          </Link>
          <a
            href="#journey"
            className="w-full rounded-sm border border-border bg-card px-7 py-3.5 font-display text-body font-semibold text-text transition-colors hover:border-primary hover:text-primary sm:w-auto"
          >
            Explore ASCENDR
          </a>
        </div>

        <p className="mt-4 text-caption text-text-secondary">
          Free to start · No credit card required
        </p>
      </div>
    </section>
  );
}
