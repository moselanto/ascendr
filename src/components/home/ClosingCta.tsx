import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

/**
 * Closing CTA: a contained panel, narrower than the content grid so it reads
 * as a deliberate full stop rather than another full-width band. Even padding
 * on all sides; no glow.
 */
export function ClosingCta() {
  return (
    <section className="bg-white px-6 pb-16 pt-16 md:pb-20 md:pt-20">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-ink px-8 py-14 text-center md:px-16 md:py-16">
        <div aria-hidden className="bg-dots-light mask-radial absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-white md:text-[42px]">
            Where do you want to go <span className="accent-serif text-brand-200">next?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-white/65">
            Set one goal. ASCENDR works out what you are missing, who can help, and which
            opportunities are already within reach.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href={SIGNUP}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[16px] font-medium text-ink transition-colors hover:bg-brand-50"
            >
              Build my career plan <span aria-hidden>→</span>
            </Link>
            <p className="text-[14px] text-white/50">Free to start. No credit card required.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
