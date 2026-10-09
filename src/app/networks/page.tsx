import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { NetworkDemo } from "@/components/networks/NetworkDemo";
import { PILOT_CONTACT } from "@/components/home/links";

export const metadata: Metadata = {
  title: "ASCENDR Networks — Turn your network into career outcomes",
  description:
    "For VC platform teams, accelerators and universities: see who in your network is ready for the roles you need, who is within reach, and grow the rest.",
};

/**
 * ASCENDR Networks — the B2B story (PRD section 9, strategy memo sections 8-9).
 *
 * This is a public explainer with an interactive preview on sample data. The
 * product itself stays gated behind a signed design partner and the
 * organizations migration (PRD section 7). Nothing here claims customers.
 */

const LAYERS = [
  {
    name: "Network intelligence",
    q: "Who can introduce me?",
    body: "Maps relationships so a fund can make warm introductions and share jobs across its portfolio.",
    us: false,
  },
  {
    name: "Talent intelligence",
    q: "Who fits this role today?",
    body: "Searches people by skills and experience to find the best match in an existing pool.",
    us: false,
  },
  {
    name: "Career intelligence",
    q: "Who can become the right person, and how fast?",
    body: "Shows every member what stands between them and the roles the network needs, then helps them close it.",
    us: true,
  },
];

const PILOT = [
  { when: "Week 1", title: "Invite your network", body: "Share one link with founders, operators, alumni or students. No integration needed to start." },
  { when: "Weeks 2-4", title: "Members set goals", body: "Each member gets a plan: their gaps, the people who can help, and the roles in your network within reach." },
  { when: "Week 6", title: "You see the map", body: "Who is ready for which portfolio roles, who will be within 90 days, and which skills are in short supply." },
  { when: "Week 12", title: "Outcome report", body: "Introductions, interviews and hires that came from your network, with how each one was verified." },
];

const METRICS = [
  { name: "Career activation", def: "Share of members who set a goal and received a plan." },
  { name: "Network activation", def: "Share who connected with a mentor, expert or community." },
  { name: "Action within 7 days", def: "Share who completed a meaningful career action in their first week." },
  { name: "Outcome within 90 days", def: "Interviews, offers, hires, promotions and introductions, marked self-reported or partner-confirmed." },
];

const AUDIENCES = [
  { name: "VC platform teams", body: "Grow the talent your portfolio is hiring for, and show your LPs the value your network creates." },
  { name: "Accelerators", body: "Give every cohort founder a bench of mentors and operators matched to what they are missing." },
  { name: "Universities", body: "Career infrastructure for students and alumni, with outcomes you can report." },
  { name: "Professional associations", body: "Turn membership into measurable career progress, not just a newsletter." },
];

export default function NetworksPage() {
  return (
    <main className="min-h-screen bg-white text-text">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="bg-grid mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-[460px]" />
        <div className="relative mx-auto max-w-4xl px-6 pb-12 pt-14 text-center md:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1 text-[13px] font-medium text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            ASCENDR Networks · for funds, accelerators and universities in Europe and North America
          </span>
          <h1 className="mt-6 text-[40px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[60px]">
            Your network already holds your next hires.{" "}
            <span className="accent-serif text-brand-600">Most of them just aren&apos;t ready yet.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lead text-text-secondary">
            ASCENDR shows who in your network is ready for the roles you need, who will be within 90 days, and what
            each of them is missing. Then it helps them close the gap, and shows you the outcomes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[16px] font-medium text-white transition-colors hover:bg-ink-700"
            >
              Try the interactive demo <span aria-hidden>↓</span>
            </a>
            <a
              href={PILOT_CONTACT}
              className="inline-flex items-center rounded-full border border-ink/15 bg-white px-7 py-3.5 text-[16px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              Run a pilot
            </a>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="scroll-mt-20 px-4 pb-16 md:px-6 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <NetworkDemo />
        </div>
      </section>

      {/* Thesis */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <p className="text-[14px] font-medium text-brand-600">Where ASCENDR fits</p>
            <h2 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[44px]">
              The first two search a fixed pool. <span className="accent-serif">ASCENDR grows it.</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {LAYERS.map((l, i) => (
              <div
                key={l.name}
                className={`relative rounded-2xl p-7 ${l.us ? "bg-ink text-white" : "border border-ink/10 bg-white"}`}
              >
                <p className={`nums text-[13px] ${l.us ? "text-white/50" : "text-text-secondary"}`}>Layer {i + 1}</p>
                <p className={`mt-6 text-[13px] font-medium uppercase tracking-[0.12em] ${l.us ? "text-brand-200" : "text-text-secondary"}`}>
                  {l.name}
                </p>
                <p className={`mt-2 text-[22px] font-semibold leading-snug tracking-tight ${l.us ? "text-white" : "text-ink"}`}>{l.q}</p>
                <p className={`mt-3 text-[15px] leading-relaxed ${l.us ? "text-white/70" : "text-text-secondary"}`}>{l.body}</p>
                {l.us && (
                  <span className="mt-6 inline-block rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white">
                    ASCENDR
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-3xl text-[16px] leading-relaxed text-text-secondary">
            ASCENDR works alongside network and talent tools rather than replacing them. They find the right person
            in the network. ASCENDR makes more people in the network the right person.
          </p>
        </div>
      </section>

      {/* Pilot */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[14px] font-medium text-brand-600">How a pilot works</p>
            <h2 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[44px]">
              Twelve weeks to a <span className="accent-serif">number you can report.</span>
            </h2>
            <p className="mt-5 max-w-md text-lead text-text-secondary">
              A pilot is judged on one thing: did your network produce more career outcomes than it would have
              without ASCENDR?
            </p>
          </div>

          <ol className="relative space-y-4">
            <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px bg-ink/10" />
            {PILOT.map((p, i) => (
              <li key={p.title} className="relative flex gap-5">
                <span className="nums relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white text-[14px] font-semibold text-ink">
                  {i + 1}
                </span>
                <div className="flex-1 rounded-xl border border-ink/[0.08] px-5 py-4">
                  <p className="text-[13px] text-text-secondary">{p.when}</p>
                  <p className="mt-0.5 text-[17px] font-semibold text-ink">{p.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Metrics */}
      <section className="border-t border-ink/[0.06] bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-[14px] font-medium text-brand-600">What you measure</p>
              <h2 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[44px]">
                Outcomes, <span className="accent-serif">not sign-ups.</span>
              </h2>
            </div>
            <p className="max-w-md text-lead text-text-secondary lg:justify-self-end">
              The same four definitions power the member product, your dashboard and your board report, so the
              numbers never disagree.
            </p>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((m, i) => (
              <div key={m.name} className="bg-white p-6">
                <p className="nums text-[13px] text-text-secondary">0{i + 1}</p>
                <p className="mt-6 text-[18px] font-semibold text-ink">{m.name}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{m.def}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <p className="text-[14px] font-medium text-brand-600">Who it is for</p>
          <h2 className="mt-3 max-w-2xl text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[44px]">
            Any organization whose <span className="accent-serif">people are the product.</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {AUDIENCES.map((a) => (
              <div key={a.name} className="rounded-2xl border border-ink/10 p-6">
                <p className="text-[18px] font-semibold text-ink">{a.name}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="bg-white px-6 pb-16 md:pb-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-ink px-8 py-14 text-center md:px-16 md:py-16">
          <div aria-hidden className="bg-dots-light mask-radial absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-white md:text-[42px]">
              Pilot ASCENDR with <span className="accent-serif text-brand-200">your network.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-white/65">
              We are looking for a small number of design partners: funds, accelerators and universities that want
              to measure the career outcomes their network creates.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={PILOT_CONTACT}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[16px] font-medium text-ink transition-colors hover:bg-brand-50"
              >
                Become a design partner <span aria-hidden>→</span>
              </a>
              <Link href="/" className="text-[15px] font-medium text-white/70 hover:text-white">
                ASCENDR for individuals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
