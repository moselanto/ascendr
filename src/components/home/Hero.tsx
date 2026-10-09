import Link from "next/link";
import { SIGNUP } from "@/components/home/links";

/**
 * Homepage hero. Left: the promise. Right: a product preview built in HTML
 * (not a screenshot) showing what a member actually gets — a goal, a gap,
 * a next action and the people who can help.
 *
 * The preview reuses the illustrative "Sarah" example from the journey
 * section and is labelled as an example. No adoption numbers or logos are
 * shown until there are real ones to state.
 */

const GAPS = [
  { skill: "Product discovery", have: 35 },
  { skill: "Product analytics", have: 55 },
  { skill: "Roadmapping", have: 20 },
];

const MENTORS = [
  { initials: "AK", tone: "bg-brand-100 text-brand-700" },
  { initials: "JM", tone: "bg-emerald-100 text-emerald-800" },
  { initials: "RO", tone: "bg-amber-100 text-amber-800" },
];

function ProductPreview() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-brand-100/70 via-white to-emerald-50 blur-2xl" />

      <div className="relative rounded-2xl border border-ink/10 bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04),0_24px_60px_-24px_rgba(11,18,32,0.25)]">
        {/* window bar */}
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
          <span className="ml-3 text-[12px] text-text-secondary">Career plan · example</span>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] uppercase tracking-[0.12em] text-text-secondary">Goal</p>
              <p className="mt-1 text-[20px] font-semibold tracking-tight text-ink">
                Support Lead <span className="text-text-secondary">→</span> Product Manager
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-800">
              Partial match
            </span>
          </div>

          <div className="mt-6 space-y-3.5">
            {GAPS.map((g) => (
              <div key={g.skill}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium text-ink">{g.skill}</span>
                  <span className="text-text-secondary">Gap</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface">
                  <div className="h-1.5 rounded-full bg-ink" style={{ width: `${g.have}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-ink p-4 text-white">
            <p className="text-[12px] uppercase tracking-[0.12em] text-white/60">Next best action</p>
            <p className="mt-1 text-[15px] font-medium">Book a 30-min discovery chat with a PM mentor</p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center">
              {MENTORS.map((m, i) => (
                <span
                  key={m.initials}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold ${m.tone} ${i ? "-ml-2" : ""}`}
                >
                  {m.initials}
                </span>
              ))}
              <span className="ml-3 text-[13px] text-text-secondary">3 mentors matched</span>
            </div>
            <span className="text-[13px] font-medium text-ink">7 roles in reach</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-[640px]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-16 md:pt-24 lg:grid-cols-[1.1fr_1fr] lg:pb-32">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1 text-[13px] font-medium text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Career intelligence platform
          </span>

          <h1 className="mt-7 text-[44px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-display lg:text-hero">
            Your network.
            <br />
            Your skills.
            <br />
            <span className="accent-serif text-brand-600">Your next opportunity.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lead text-text-secondary">
            ASCENDR connects your goals, skills, mentors and professional network, then turns
            them into a plan you can act on, so career ambition becomes measurable progress.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={SIGNUP}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[16px] font-medium text-white transition-colors hover:bg-ink-700"
            >
              Build my career plan
              <span aria-hidden>→</span>
            </Link>
            <a
              href="#journey"
              className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-7 py-3.5 text-[16px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              See how it works
            </a>
          </div>

          <p className="mt-5 text-[14px] text-text-secondary">Free to start. No credit card required.</p>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}
