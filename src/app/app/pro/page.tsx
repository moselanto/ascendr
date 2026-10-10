import Link from "next/link";
import { LIMITS } from "@/lib/usage";
import { joinProEarlyAccess } from "./actions";

export const metadata = { title: "ASCENDR Pro" };

const USAGE = [
  { label: "AI career coach conversations", free: LIMITS["ai:coach"].free, pro: LIMITS["ai:coach"].pro, unit: "per day" },
  { label: "Mock interviews with feedback", free: LIMITS["ai:interview"].free, pro: LIMITS["ai:interview"].pro, unit: "per day" },
  { label: "Resume reviews", free: LIMITS["ai:resume-review"].free, pro: LIMITS["ai:resume-review"].pro, unit: "per day" },
  { label: "AI career plans", free: LIMITS["ai:career-plan"].free, pro: LIMITS["ai:career-plan"].pro, unit: "per day" },
  { label: "Questions to mentor AI clones", free: LIMITS["ai:mentor-ask"].free, pro: LIMITS["ai:mentor-ask"].pro, unit: "per day" },
];

const INCLUDED = [
  "Skills gap analysis against real role requirements",
  "90-day roadmap and learning paths",
  "Mentor matching by missing skill",
  "Communities, live sessions and messaging",
  "Outcomes ledger",
];

const PRO_EXTRA = [
  { title: "More AI, every day", body: "Higher daily limits on the coach, interview practice, resume reviews and career plans." },
  { title: "Interview practice that adapts", body: "Run full mock interviews for your target role, with feedback on every answer." },
  { title: "Deeper readiness insight", body: "Track how your readiness for your target role changes week by week." },
  { title: "Priority with mentors and networks", body: "Stand out when mentors and network admins review who is ready." },
];

const FAQ = [
  { q: "Is ASCENDR still free?", a: "Yes. Everything you use today stays free. Pro adds higher limits and deeper tools on top." },
  { q: "When does Pro launch, and what will it cost?", a: "Pro is in early access. People on the list get launch pricing first, and nobody is charged without choosing a plan." },
  { q: "I run a fund, accelerator or university.", a: "ASCENDR Networks gives you a readiness map of your members, pathways, consented introductions and outcome reporting. Ask us about a 90-day pilot." },
];

const check = <span aria-hidden className="text-accent">{"\u2713"}</span>;

export default function ProPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white md:px-12 md:py-14">
        <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            ASCENDR Pro {"\u00b7"} Early access
          </span>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] md:text-[46px]">
            Go further, <span className="accent-serif text-brand-200">faster.</span>
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-white/70">
            Deeper career intelligence and far more interview practice, for people serious about their next move.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <form action={joinProEarlyAccess}>
              <input type="hidden" name="plan" value="pro" />
              <button className="rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-ink hover:bg-brand-50">
                Join Pro early access
              </button>
            </form>
            <a href="#compare" className="rounded-full border border-white/25 px-6 py-3 text-[15px] font-medium text-white hover:border-white/60">
              Compare plans
            </a>
          </div>
        </div>
      </section>

      {/* What Pro adds */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRO_EXTRA.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[14px] text-brand-700">{"\u2726"}</span>
            <p className="mt-3 text-[15px] font-semibold text-ink">{f.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Plans */}
      <section id="compare" className="scroll-mt-24">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Plans</p>
        <h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-ink">Choose how far you want to go</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-card">
            <p className="text-[15px] font-semibold text-ink">Free</p>
            <p className="mt-1 text-[13px] text-text-secondary">Everything you need to start.</p>
            <p className="mt-5 text-[32px] font-semibold tracking-tight text-ink">$0</p>
            <span className="mt-1 w-fit rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-text-secondary">Your current plan</span>
            <ul className="mt-5 space-y-2 text-[14px] text-ink/85">
              {INCLUDED.map((i) => (
                <li key={i} className="flex gap-2">{check}{i}</li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border-2 border-ink bg-white p-6 shadow-lift">
            <span className="absolute -top-3 left-6 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Recommended</span>
            <p className="text-[15px] font-semibold text-ink">Pro</p>
            <p className="mt-1 text-[13px] text-text-secondary">For an active job search or career switch.</p>
            <p className="mt-5 text-[22px] font-semibold tracking-tight text-ink">Early-access pricing</p>
            <p className="mt-1 text-[12px] text-text-secondary">Announced to the list first. No card needed to join.</p>
            <ul className="mt-5 space-y-2 text-[14px] text-ink/85">
              <li className="flex gap-2">{check}Everything in Free</li>
              {PRO_EXTRA.map((f) => (
                <li key={f.title} className="flex gap-2">{check}{f.title}</li>
              ))}
            </ul>
            <form action={joinProEarlyAccess} className="mt-auto pt-6">
              <input type="hidden" name="plan" value="pro" />
              <button className="w-full rounded-full bg-ink px-4 py-3 text-[14px] font-semibold text-white hover:bg-ink-700">Join early access</button>
            </form>
          </div>

          {/* Networks */}
          <div className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-card">
            <p className="text-[15px] font-semibold text-ink">Networks</p>
            <p className="mt-1 text-[13px] text-text-secondary">For funds, accelerators and universities.</p>
            <p className="mt-5 text-[22px] font-semibold tracking-tight text-ink">90-day pilot</p>
            <p className="mt-1 text-[12px] text-text-secondary">Priced per network, not per seat.</p>
            <ul className="mt-5 space-y-2 text-[14px] text-ink/85">
              {["Readiness map for the roles you hire for", "Readiness trend over time", "Development pathways for members", "Consented introductions", "Interview and hire reporting"].map((i) => (
                <li key={i} className="flex gap-2">{check}{i}</li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-2 pt-6">
              <form action={joinProEarlyAccess}>
                <input type="hidden" name="plan" value="networks" />
                <button className="w-full rounded-full border border-ink/15 bg-white px-4 py-3 text-[14px] font-semibold text-ink hover:border-ink/40">Talk to us about a pilot</button>
              </form>
              <Link href="/app/network" className="text-center text-[13px] font-medium text-brand-600 hover:text-brand-700">Open Network intelligence {"\u2192"}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Limits table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <div className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-border bg-surface px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          <span>Daily AI limits</span>
          <span className="text-center">Free</span>
          <span className="text-center">Pro</span>
        </div>
        {USAGE.map((u) => (
          <div key={u.label} className="grid grid-cols-[1.6fr_1fr_1fr] items-center border-b border-border px-5 py-3.5 last:border-0">
            <span className="text-[14px] text-ink">{u.label}</span>
            <span className="nums text-center text-[14px] text-text-secondary">{u.free} {u.unit}</span>
            <span className="nums text-center text-[14px] font-semibold text-ink">{u.pro} {u.unit}</span>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="grid gap-4 md:grid-cols-3">
        {FAQ.map((f) => (
          <div key={f.q} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[14px] font-semibold text-ink">{f.q}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{f.a}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
