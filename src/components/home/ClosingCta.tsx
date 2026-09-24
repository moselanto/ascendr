import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

export function ClosingCta() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center md:py-24">
        <h2 className="font-display text-h2 md:text-h1">
          Where do you want to go next?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-body text-text-secondary">
          Set one goal. ASCENDR works out what you are missing, who can help, and which
          opportunities are already within reach.
        </p>
        <Link
          href={SIGNUP}
          className="mt-8 inline-block rounded-sm bg-primary px-7 py-3.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Build My Career Plan
        </Link>
        <p className="mt-4 text-caption text-text-secondary">
          Free to start · No credit card required
        </p>
      </div>
    </section>
  );
}
