import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

/**
 * Closing CTA. Inverted to the brand navy so the page ends on a deliberate
 * block rather than fading into another pale section — the previous version
 * used the same tint as the hero, which made the page feel unfinished.
 */
export function ClosingCta() {
  return (
    <section className="bg-text">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
        <h2 className="text-h2 text-white md:text-h1">Where do you want to go next?</h2>
        <p className="mx-auto mt-5 max-w-xl text-lead text-white/70">
          Set one goal. ASCENDR works out what you are missing, who can help, and which
          opportunities are already within reach.
        </p>
        <Link
          href={SIGNUP}
          className="mt-9 inline-block rounded-sm bg-white px-8 py-4 text-[17px] font-semibold text-text transition-colors hover:bg-brand-50 hover:text-primary"
        >
          Build My Career Plan
        </Link>
        <p className="mt-4 text-small text-white/55">
          Free to start · No credit card required
        </p>
      </div>
    </section>
  );
}
