import Link from "next/link";
import { LIMITS } from "@/lib/usage";
import { joinProEarlyAccess } from "./actions";
import { startCheckout } from "../billing/actions";
import { getCurrentProfile } from "@/lib/data";
import { getTier } from "@/lib/usage";

export const metadata = { title: "Plans and pricing | ASCENDR" };

const USAGE = [
  { label: "AI career coach conversations", free: LIMITS["ai:coach"].free, plus: LIMITS["ai:coach"].plus, starter: LIMITS["ai:coach"].starter, pro: LIMITS["ai:coach"].pro },
  { label: "Mock interviews with feedback", free: LIMITS["ai:interview"].free, plus: LIMITS["ai:interview"].plus, starter: LIMITS["ai:interview"].starter, pro: LIMITS["ai:interview"].pro },
  { label: "Resume reviews", free: LIMITS["ai:resume-review"].free, plus: LIMITS["ai:resume-review"].plus, starter: LIMITS["ai:resume-review"].starter, pro: LIMITS["ai:resume-review"].pro },
  { label: "AI career plans", free: LIMITS["ai:career-plan"].free, plus: LIMITS["ai:career-plan"].plus, starter: LIMITS["ai:career-plan"].starter, pro: LIMITS["ai:career-plan"].pro },
  { label: "Questions to mentor AI clones", free: LIMITS["ai:mentor-ask"].free, plus: LIMITS["ai:mentor-ask"].plus, starter: LIMITS["ai:mentor-ask"].starter, pro: LIMITS["ai:mentor-ask"].pro },
];

type Plan = {
  key: "free" | "starter" | "pro" | "custom";
  name: string;
  tagline: string;
  price: string;
  per?: string;
  highlight?: boolean;
  intro: string;
  features: string[];
  cta: string;
};

const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free",
    tagline: "Start your career plan.",
    price: "KES 0",
    intro: "Includes, with daily limits:",
    features: [
      "Skills gap analysis for 1 target role",
      "90-day roadmap and learning paths",
      `${LIMITS["ai:coach"].free} AI coach messages a day`,
      `${LIMITS["ai:interview"].free} mock interviews a day`,
      "Communities, messaging and mentors",
      "Join networks you are invited to",
    ],
    cta: "Your current plan",
  },
  {
    key: "starter",
    name: "Starter",
    tagline: "For small networks and teams.",
    price: "KES 13,000",
    per: "/month",
    intro: "Everything in Free, plus:",
    features: [
      `${LIMITS["ai:coach"].starter} AI coach messages a day`,
      `${LIMITS["ai:interview"].starter} mock interviews and ${LIMITS["ai:resume-review"].starter} resume reviews a day`,
      "Network of up to 50 members",
      "Up to 3 open roles with a readiness map",
      "Development pathways for members",
      "Email support",
    ],
    cta: "Get Starter",
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "For funds and accelerators running a talent program.",
    price: "KES 26,000",
    per: "/month",
    highlight: true,
    intro: "Everything in Starter, plus:",
    features: [
      `${LIMITS["ai:coach"].pro} AI coach messages a day`,
      `${LIMITS["ai:interview"].pro} mock interviews and ${LIMITS["ai:resume-review"].pro} resume reviews a day`,
      "Network of up to 250 members",
      "Unlimited open roles",
      "Readiness trend over time",
      "Consented introductions and talent pipeline",
      "Interview and hire outcome reporting",
      "Priority support",
    ],
    cta: "Get Pro",
  },
  {
    key: "custom",
    name: "Custom",
    tagline: "For universities and large networks.",
    price: "Custom",
    intro: "Everything in Pro, plus:",
    features: [
      "Unlimited members and cohorts",
      "Custom roles and skill frameworks",
      "Single sign-on (SSO)",
      "Onboarding and admin training",
      "Invoicing and annual contracts",
      "Dedicated success manager",
    ],
    cta: "Contact sales",
  },
];

const FAQ = [
  { q: "Can I keep using ASCENDR for free?", a: "Yes. The Free plan stays free, with daily limits on AI tools and one target role." },
  { q: "Which plan is for me as an individual?", a: "Plus. It costs KES 499 a month, you can pay by M-Pesa, and it more than doubles your daily AI coaching, interview practice and resume reviews." },
  { q: "Who are Starter and Pro for?", a: "Network operators such as funds, accelerators and associations who want to develop and place their members." },
  { q: "How does billing work?", a: "Plus is a one-off monthly payment by M-Pesa or card; pay again to add another month. Starter and Pro are billed monthly by card through Paystack. You can update your card or cancel from Billing at any time, and keep your plan until the period ends." },
  { q: "Do you offer annual billing?", a: "Yes, through the Custom plan. Contact sales for annual contracts and invoicing." },
  { q: "We're a university. Which plan fits?", a: "Custom. We set up your programs, cohorts and skill frameworks, and connect your sign-in system." },
];

const check = <span aria-hidden className="text-accent">{"✓"}</span>;

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const profile = await getCurrentProfile();
  const tier = profile ? await getTier(profile.id) : "free";
  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16">
      {/* Head */}
      <div className="text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Plans and pricing</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.025em] text-ink md:text-[42px]">
          Go further, <span className="accent-serif">faster.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-relaxed text-text-secondary">
          Start free. Upgrade when you need more AI coaching, interview practice, or a network of people to develop and place.
        </p>
      </div>

      {/* Individuals */}
      <section className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">For individuals</p>
          <p className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink">
            Plus <span className="text-[16px] font-normal text-text-secondary">KES 499/month, pay by M-Pesa</span>
          </p>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-text-secondary">
            {LIMITS["ai:coach"].plus} AI coach messages, {LIMITS["ai:interview"].plus} mock interviews and {LIMITS["ai:resume-review"].plus} resume reviews a day. No
            automatic renewal: pay again when you want another month.
          </p>
        </div>
        {tier === "plus" ? (
          <Link href="/app/billing" className="w-fit rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-ink/10 hover:ring-ink/30">
            Your current plan
          </Link>
        ) : (
          <form action={startCheckout}>
            <input type="hidden" name="plan" value="plus" />
            <button className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-ink-700">Get Plus</button>
          </form>
        )}
      </section>

      {/* Plans */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => (
          <div
            key={p.key}
            id={p.key}
            className={`relative flex scroll-mt-24 flex-col rounded-2xl bg-white p-6 ${p.highlight ? "border-2 border-ink shadow-lift" : "border border-border shadow-card"}`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                Most popular
              </span>
            )}
            <p className="text-[16px] font-semibold text-ink">{p.name}</p>
            <p className="mt-1 min-h-[40px] text-[13px] leading-snug text-text-secondary">{p.tagline}</p>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-1">
              <span className={`${p.price.length > 6 ? "text-[26px]" : "text-[36px]"} whitespace-nowrap font-semibold tracking-tight text-ink`}>{p.price}</span>
              {p.per && <span className="text-[14px] text-text-secondary">{p.per}</span>}
            </p>
            <p className="mt-1 text-[12px] text-text-secondary">
              {p.key === "custom" ? "Tailored to your institution" : p.key === "free" ? "Free forever" : "Billed monthly in KES. Cancel anytime"}
            </p>

            {p.key === tier || (p.key === "free" && tier === "premium") ? (
              <span className="mt-5 block rounded-full bg-surface px-4 py-2.5 text-center text-[14px] font-medium text-text-secondary">Your current plan</span>
            ) : p.key === "free" ? (
              <span className="mt-5 block rounded-full border border-border px-4 py-2.5 text-center text-[14px] font-medium text-text-secondary">Included</span>
            ) : (
              <form action={p.key === "custom" ? joinProEarlyAccess : startCheckout} className="mt-5">
                <input type="hidden" name="plan" value={p.key} />
                <button
                  className={`w-full rounded-full px-4 py-2.5 text-[14px] font-semibold ${
                    p.highlight ? "bg-ink text-white hover:bg-ink-700" : "border border-ink/15 bg-white text-ink hover:border-ink/40"
                  }`}
                >
                  {p.cta}
                </button>
              </form>
            )}

            <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{p.intro}</p>
            <ul className="mt-3 space-y-2 text-[14px] text-ink/85">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  {check}
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Limits table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-b border-border bg-surface px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          <span>Daily AI limits</span>
          <span className="text-center">Free</span>
          <span className="text-center">Plus</span>
          <span className="text-center">Starter</span>
          <span className="text-center">Pro</span>
        </div>
        {USAGE.map((u) => (
          <div key={u.label} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] items-center border-b border-border px-5 py-3.5 last:border-0">
            <span className="text-[14px] text-ink">{u.label}</span>
            <span className="nums text-center text-[14px] text-text-secondary">{u.free}</span>
            <span className="nums text-center text-[14px] text-ink">{u.plus}</span>
            <span className="nums text-center text-[14px] text-ink">{u.starter}</span>
            <span className="nums text-center text-[14px] font-semibold text-ink">{u.pro}</span>
          </div>
        ))}
        <p className="border-t border-border bg-surface px-5 py-3 text-[12px] text-text-secondary">Custom plans set limits to fit your institution.</p>
      </section>

      {/* University band */}
      <section className="relative overflow-hidden rounded-2xl bg-ink p-7 text-white md:p-9">
        <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">Universities and large networks</p>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">
              Develop every cohort toward the roles <span className="accent-serif text-brand-200">employers need.</span>
            </h2>
            <p className="mt-2 text-[14px] text-white/70">Readiness maps, pathways, consented introductions and outcome reporting across your whole institution.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action={joinProEarlyAccess}>
              <input type="hidden" name="plan" value="custom" />
              <button className="rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-ink hover:bg-brand-50">Contact sales</button>
            </form>
            <Link href="/networks" className="rounded-full border border-white/25 px-5 py-3 text-[14px] font-medium text-white hover:border-white/60">
              See the demo
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="grid gap-4 md:grid-cols-2">
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
