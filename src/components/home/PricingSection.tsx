import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { PILOT_CONTACT, SIGNUP } from "@/components/home/links";

export function PricingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PLANS.map((p) => (
        <div
          key={p.key}
          className={`relative flex flex-col rounded-2xl bg-white p-6 ${p.highlight ? "border-2 border-ink shadow-lift" : "border border-ink/10 shadow-card"}`}
        >
          {p.highlight && (
            <span className="absolute -top-3 left-6 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Most popular</span>
          )}
          <p className="text-[16px] font-semibold text-ink">{p.name}</p>
          <p className="mt-1 min-h-[40px] text-[13px] leading-snug text-text-secondary">{p.tagline}</p>
          <p className="mt-4 flex items-baseline gap-1">
            <span className="text-[28px] font-semibold tracking-tight text-ink">{p.price}</span>
            {p.per && <span className="text-[14px] text-text-secondary">{p.per}</span>}
          </p>
          <ul className="mt-5 flex-1 space-y-2 text-[14px] text-ink/85">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="text-accent">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href={p.key === "custom" ? PILOT_CONTACT : SIGNUP}
            className={`mt-6 block rounded-full px-4 py-2.5 text-center text-[14px] font-semibold ${
              p.highlight ? "bg-ink text-white hover:bg-ink-700" : "border border-ink/15 text-ink hover:border-ink/40"
            }`}
          >
            {p.key === "free" ? "Start free" : p.key === "custom" ? "Contact sales" : `Choose ${p.name}`}
          </Link>
        </div>
      ))}
    </div>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-surface px-6 py-20 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[14px] font-medium text-brand-600">Pricing</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[44px]">
            Start free. <span className="accent-serif">Grow when you&apos;re ready.</span>
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-text-secondary">Simple monthly plans in KES. Cancel anytime.</p>
        </div>
        <div className="mt-10">
          <PricingCards />
        </div>
        <p className="mt-6 text-[14px] text-text-secondary">
          Full comparison on the{" "}
          <Link href="/pricing" className="font-medium text-ink underline-offset-4 hover:underline">pricing page →</Link>
        </p>
      </div>
    </section>
  );
}
