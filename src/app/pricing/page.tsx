import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { PricingCards } from "@/components/home/PricingSection";
import { LIMITS } from "@/lib/usage";
import { PILOT_CONTACT } from "@/components/home/links";

export const metadata = {
  title: "Pricing | ASCENDR",
  description: "Free, Starter, Pro and Custom plans for members, funds, accelerators and universities.",
};

const ROWS: { label: string; free: string; starter: string; pro: string; custom: string }[] = [
  { label: "AI coach messages a day", free: String(LIMITS["ai:coach"].free), starter: String(LIMITS["ai:coach"].starter), pro: String(LIMITS["ai:coach"].pro), custom: "Custom" },
  { label: "Mock interviews a day", free: String(LIMITS["ai:interview"].free), starter: String(LIMITS["ai:interview"].starter), pro: String(LIMITS["ai:interview"].pro), custom: "Custom" },
  { label: "Resume reviews a day", free: String(LIMITS["ai:resume-review"].free), starter: String(LIMITS["ai:resume-review"].starter), pro: String(LIMITS["ai:resume-review"].pro), custom: "Custom" },
  { label: "Target roles with gap analysis", free: "1", starter: "Unlimited", pro: "Unlimited", custom: "Unlimited" },
  { label: "Network members", free: "Join only", starter: "Up to 50", pro: "Up to 250", custom: "Unlimited" },
  { label: "Open roles with readiness map", free: "–", starter: "3", pro: "Unlimited", custom: "Unlimited" },
  { label: "Development pathways", free: "–", starter: "✓", pro: "✓", custom: "✓" },
  { label: "Readiness trend over time", free: "–", starter: "–", pro: "✓", custom: "✓" },
  { label: "Consented introductions and hire reporting", free: "–", starter: "–", pro: "✓", custom: "✓" },
  { label: "Custom roles, SSO, invoicing", free: "–", starter: "–", pro: "–", custom: "✓" },
];

const FAQ = [
  { q: "Can I start for free?", a: "Yes. Create an account, set a goal and see your skills gap at no cost. Upgrade only when you need more." },
  { q: "How do I pay?", a: "Starter and Pro are billed monthly in KES by card through Paystack. You can cancel anytime and keep your plan until the period ends." },
  { q: "We run a fund or accelerator. Where do we start?", a: "Most networks start with Pro and a 90-day pilot: a few open roles, one cohort of members, and a clear set of outcomes to measure." },
  { q: "We're a university.", a: "Choose Custom. We set up your cohorts and skill frameworks, connect your sign-in, and invoice annually." },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-text">
      <SiteHeader />
      <section className="relative overflow-hidden px-6 pb-14 pt-14 text-center md:pt-20">
        <div aria-hidden className="bg-grid mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-[14px] font-medium text-brand-600">Pricing</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink md:text-[56px]">
            Plans that grow <span className="accent-serif text-brand-600">with you.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[18px] leading-relaxed text-text-secondary">
            Start free as a member. Upgrade for more coaching, or to develop and place the talent in your network.
          </p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl">
          <PricingCards />
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl overflow-x-auto rounded-2xl border border-ink/10 shadow-card">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="bg-surface text-[12px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                <th className="px-5 py-3.5">Compare plans</th>
                <th className="px-5 py-3.5 text-center">Free</th>
                <th className="px-5 py-3.5 text-center">Starter</th>
                <th className="px-5 py-3.5 text-center text-ink">Pro</th>
                <th className="px-5 py-3.5 text-center">Custom</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-t border-ink/[0.07] text-[14px]">
                  <td className="px-5 py-3.5 text-ink">{r.label}</td>
                  <td className="nums px-5 py-3.5 text-center text-text-secondary">{r.free}</td>
                  <td className="nums px-5 py-3.5 text-center text-ink">{r.starter}</td>
                  <td className="nums bg-brand-50/40 px-5 py-3.5 text-center font-semibold text-ink">{r.pro}</td>
                  <td className="nums px-5 py-3.5 text-center text-ink">{r.custom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-ink/[0.06] bg-surface px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-2xl border border-ink/10 bg-white p-6">
              <p className="text-[16px] font-semibold text-ink">{f.q}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{f.a}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-[15px] text-text-secondary">
          Questions about a pilot or a custom plan?{" "}
          <a href={PILOT_CONTACT} className="font-medium text-ink underline-offset-4 hover:underline">Talk to us →</a>
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
