import Link from "next/link";
import { LIMITS } from "@/lib/usage";
import { joinProEarlyAccess } from "./actions";

export const metadata = { title: "Plans and pricing | ASCENDR" };

const USAGE = [
  { label: "AI career coach conversations", free: LIMITS["ai:coach"].free, starter: LIMITS["ai:coach"].starter, pro: LIMITS["ai:coach"].pro },
  { label: "Mock interviews with feedback", free: LIMITS["ai:interview"].free, starter: LIMITS["ai:interview"].starter, pro: LIMITS["ai:interview"].pro },
  { label: "Resume reviews", free: LIMITS["ai:resume-review"].free, starter: LIMITS["ai:resume-review"].starter, pro: LIMITS["ai:resume-review"].pro },
  { label: "AI career plans", free: LIMITS["ai:career-plan"].free, starter: LIMITS["ai:career-plan"].starter, pro: LIMITS["ai:career-plan"].pro },
  { label: "Questions to mentor AI clones", free: LIMITS["ai:mentor-ask"].free, starter: LIMITS["ai:mentor-ask"].starter, pro: LIMITS["ai:mentor-ask"].pro },
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
    price: "$0",
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
    tagline: "For small networks and serious job seekers.",
    price: "$99",
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
    price: "$199",
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
  { q: "Who are Starter and Pro for?", a: "Individuals who want much more AI coaching and interview practice, and network operators such as funds and accelerators who want to develop and place their members." },
  { q: "Do you offer annual billing?", a: "Yes, through the Custom plan. Contact sales for annual contracts and invoicing." },
  { q: "We're a university. Which plan fits?", a: "Custom. We set up your programs, cohorts and skill frameworks, and connect your sign-in system." },
];

const check = <span aria-hidden className="text-accent">{"\u2713"}</span>;

export default function PlansPage() {
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

      {/* Plans */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => (
          <div
            key={p.key}
            className={`relative flex flex-col rounded-2xl bg-white p-6 ${p.highlight ? "border-2 border-ink shadow-lift" : "border border-border shadow-card"}`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                Most popular
              </span>
            )}
            <p className="text-[16px] font-semibold text-ink">{p.name}</p>
            <p className="mt-1 min-h-[40px] text-[13px] leading-snug text-text-secondary">{p.tagline}</p>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-[36px] font-semibold tracking-tight text-ink">{p.price}</span>
              {p.per && <span className="text-[14px] text-text-secondary">{p.per}</span>}
            </p>
            <p className="mt-1 text-[12px] text-text-secondary">
              {p.key === "custom" ? "Tailored to your institution" : p.key === "free" ? "Free forever" : "Billed monthly"}
            </p>

            {p.key === "free" ? (
              <span className="mt-5 block rounded-full bg-surface px-4 py-2.5 text-center text-[14px] font-medium text-text-secondary">{p.cta}</span>
            ) : (
              <form action={joinProEarlyAccess} className="mt-5">
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
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-border bg-surface px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          <span>Daily AI limits</span>
          <span className="text-center">Free</span>
          <span className="text-center">Starter</span>
          <span className="text-center">Pro</span>
        </div>
        {USAGE.map((u) => (
          <div key={u.label} className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center border-b border-border px-5 py-3.5 last:border-0">
            <span className="text-[14px] text-ink">{u.label}</span>
            <span className="nums text-center text-[14px] text-text-secondary">{u.free}</span>
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
