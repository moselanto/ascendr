import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

export function ClosingCta() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-ink px-8 py-20 text-center md:py-28">
        <div aria-hidden className="bg-dots-light mask-radial absolute inset-0" />
        <div aria-hidden className="absolute -top-40 left-1/2 h-80 w-[640px] -translate-x-1/2 rounded-full bg-brand-500/30 blur-3xl" />

        <div className="relative">
          <h2 className="mx-auto max-w-3xl text-h1 font-semibold text-white md:text-display">
            Where do you want to <span className="accent-serif text-brand-200">go next?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lead text-white/65">
            Set one goal. ASCENDR works out what you are missing, who can help, and which
            opportunities are already within reach.
          </p>
          <Link
            href={SIGNUP}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[16px] font-medium text-ink transition-colors hover:bg-brand-50"
          >
            Build my career plan <span aria-hidden>→</span>
          </Link>
          <p className="mt-5 text-[14px] text-white/50">Free to start. No credit card required.</p>
        </div>
      </div>
    </section>
  );
}
