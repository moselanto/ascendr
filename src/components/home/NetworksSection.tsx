import Link from "next/link";
import { PILOT_CONTACT } from "@/components/home/links";

/** Illustrative readiness map. Labelled as an example; no real people. */
const BANDS = [
  { label: "Ready now", dot: "bg-emerald-400", people: ["AK", "LM"] },
  { label: "Within 90 days", dot: "bg-amber-400", people: ["JO", "TN", "RW", "SB"] },
  { label: "Developing", dot: "bg-brand-300", people: ["FA", "DK", "EM"] },
];

const POINTS = [
  { title: "Readiness map", body: "Every member, sorted for every role your portfolio is hiring for." },
  { title: "Pathways", body: "Invite people who are close to work toward a role, and watch readiness rise week by week." },
  { title: "Consented introductions", body: "Members say yes before anyone is introduced. Interviews and hires are recorded as confirmed outcomes." },
];

export function NetworksSection() {
  return (
    <section id="networks" className="scroll-mt-20 bg-ink px-6 py-14 text-white md:py-16">
      <div className="relative mx-auto max-w-6xl">
        <div aria-hidden className="bg-dots-light mask-radial pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-brand-200">For funds, accelerators and universities</p>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[46px]">
              See who&apos;s ready. <span className="accent-serif text-brand-200">Grow who&apos;s close.</span>
            </h2>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/70">
              Your network already holds the talent your companies will need. ASCENDR shows you who is ready today, who could be in 90
              days, and what it will take to get them there.
            </p>
            <ul className="mt-8 space-y-5">
              {POINTS.map((p) => (
                <li key={p.title} className="flex gap-4">
                  <span aria-hidden className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] text-accent">✓</span>
                  <span>
                    <span className="block text-[16px] font-semibold">{p.title}</span>
                    <span className="mt-0.5 block text-[15px] leading-relaxed text-white/65">{p.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/networks" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-ink hover:bg-brand-50">
                Try the interactive demo <span aria-hidden>→</span>
              </Link>
              <a href={PILOT_CONTACT} className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-[15px] font-medium text-white hover:border-white/60">
                Run a 90-day pilot
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white p-5 text-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Readiness map · example</p>
                <p className="mt-1 text-[18px] font-semibold tracking-tight">Product Manager at a portfolio company</p>
              </div>
              <span className="rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-text-secondary">2 openings</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {BANDS.map((b) => (
                <div key={b.label} className="rounded-xl bg-surface p-3">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                    <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                    {b.label}
                    <span className="ml-auto nums text-text-secondary">{b.people.length}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.people.map((p) => (
                      <span key={p} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-brand-700 shadow-card">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border text-center">
              {[
                ["4", "on pathways"],
                ["3", "introductions"],
                ["1", "confirmed hire"],
              ].map(([n, l]) => (
                <div key={l} className="bg-white py-3">
                  <p className="nums text-[22px] font-semibold tracking-tight">{n}</p>
                  <p className="text-[11px] text-text-secondary">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-text-secondary">Illustrative example. Your map is built from your own members and roles.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
