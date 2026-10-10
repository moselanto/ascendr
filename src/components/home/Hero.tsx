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

type Status = "Started" | "Up next" | "Later";

const GAPS: { skill: string; status: Status; progress: number }[] = [
  { skill: "Product analytics", status: "Started", progress: 3 },
  { skill: "Product discovery", status: "Up next", progress: 1 },
  { skill: "Roadmapping", status: "Later", progress: 0 },
];

const MENTORS = [
  { initials: "AK", tone: "bg-brand-100 text-brand-700" },
  { initials: "JM", tone: "bg-emerald-100 text-emerald-800" },
  { initials: "RO", tone: "bg-amber-100 text-amber-800" },
];

/** Five quiet ticks instead of a percentage bar: progress reads as steps
 *  taken, which is how people actually describe learning a skill. */
function Steps({ filled }: { filled: number }) {
  return (
    <span className="flex gap-1" aria-label={`${filled} of 5 steps`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`h-1.5 w-4 rounded-full ${i < filled ? "bg-ink" : "bg-ink/10"}`} />
      ))}
    </span>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative rounded-2xl border border-ink/10 bg-white p-6 shadow-[0_1px_2px_rgba(11,18,32,0.04),0_20px_50px_-24px_rgba(11,18,32,0.22)] md:p-7">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-text-secondary">Sarah&apos;s plan · example</p>
          <p className="text-[13px] text-text-secondary">Week 3</p>
        </div>

        <p className="mt-3 text-[21px] font-semibold leading-snug tracking-tight text-ink">
          From Support Lead to Product Manager
        </p>
        <p className="mt-1.5 text-[14px] text-text-secondary">
          Closer than she thought. Three skills stand in the way.
        </p>

        <ul className="mt-6 divide-y divide-ink/[0.07] border-y border-ink/[0.07]">
          {GAPS.map((g) => (
            <li key={g.skill} className="flex items-center justify-between py-3">
              <span className="text-[15px] font-medium text-ink">{g.skill}</span>
              <span className="flex items-center gap-3">
                <span className="w-14 text-right text-[12px] text-text-secondary">{g.status}</span>
                <Steps filled={g.progress} />
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-l-2 border-ink pl-4">
          <p className="text-[13px] text-text-secondary">This week</p>
          <p className="mt-0.5 text-[15px] font-medium text-ink">
            30-minute chat with Amara, a PM who made the same move
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center">
            {MENTORS.map((m, i) => (
              <span
                key={m.initials}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold ${m.tone} ${i ? "-ml-2" : ""}`}
              >
                {m.initials}
              </span>
            ))}
            <span className="ml-3 text-[13px] text-text-secondary">3 mentors</span>
          </div>
          <span className="text-[13px] text-text-secondary">7 roles in reach</span>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-[520px]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-12 md:pb-20 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1 text-[13px] font-medium text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Career intelligence platform
          </span>

          <h1 className="mt-6 text-[42px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[54px] lg:text-[62px]">
            Your network. Your skills.
            <br />
            <span className="accent-serif text-brand-600">Your next opportunity.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lead text-text-secondary">
            ASCENDR connects your goals, skills, mentors and professional network, then turns
            them into a plan you can act on, so career ambition becomes measurable progress.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <p className="mt-2 text-[14px] text-text-secondary">
            Run a fund, accelerator or university?{" "}
            <Link href="/networks" className="font-medium text-ink underline-offset-4 hover:underline">
              See who in your network is ready for the roles you need {"→"}
            </Link>
          </p>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}
