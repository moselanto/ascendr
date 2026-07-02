import Link from "next/link";

export const dynamic = "force-dynamic";

const SIGNUP = "/login?mode=signup";
const SIGNIN = "/login";

const PILLARS = [
  {
    icon: "✦",
    title: "AI Career Coach",
    body: "An always-on coach that builds your plan, keeps you accountable, and tells you the single next best step — grounded in your goal.",
  },
  {
    icon: "◎",
    title: "AI Mentor Clones",
    body: "Each verified expert's knowledge becomes a cited, 24/7 AI you can ask anything — answers trace back to the exact lesson.",
  },
  {
    icon: "◉",
    title: "Live Communities",
    body: "Daily-habit spaces with realtime chat, live Q&A sessions, streaks, and leaderboards that keep momentum going.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Set your goal",
    body: "Tell us where you want to go — switch careers, get promoted, build a startup, or master a skill.",
  },
  {
    n: "2",
    title: "Get matched",
    body: "We connect you to the right mentors, communities, and a personalized AI coaching plan in minutes.",
  },
  {
    n: "3",
    title: "Grow every day",
    body: "Learn, ask, network, and earn XP. Small daily reps compound into real career momentum.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "The AI coach felt like having a mentor on call at 2am. I landed a PM role in ten weeks after switching from support.",
    name: "Aisha O.",
    role: "Product Manager",
    initials: "AO",
    grad: "from-[#f59e0b] to-danger",
  },
  {
    quote:
      "Being able to ask a mentor's AI clone and get a cited answer from their actual course changed how fast I learn.",
    name: "David M.",
    role: "Engineering Lead",
    initials: "DM",
    grad: "from-primary to-secondary",
  },
  {
    quote:
      "The streaks and live Q&A kept me showing up daily. It's the first platform that made growth a habit, not a chore.",
    name: "Grace N.",
    role: "Founder",
    initials: "GN",
    grad: "from-accent to-[#059669]",
  },
];

const FAQ = [
  {
    q: "Who is ASCENDR for?",
    a: "Professionals, career switchers, founders, and lifelong learners anywhere in the world who want structured growth with mentors, community, and AI in one place.",
  },
  {
    q: "Do I need to pay to start?",
    a: "No. Create your account, set your goal, and explore communities free. Some expert communities offer premium tiers you can join when you're ready.",
  },
  {
    q: "How is the AI different from a generic chatbot?",
    a: "ASCENDR's mentor clones are grounded in each expert's real content and cite their sources, so answers reflect proven teaching — not the open internet.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-text">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
          <Link href="/" className="text-xl font-black">
            ASCEND<span className="text-primary">R</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-small font-semibold text-text-secondary md:flex">
            <a href="#features" className="hover:text-text">Features</a>
            <a href="#how" className="hover:text-text">How it works</a>
            <a href="#stories" className="hover:text-text">Stories</a>
            <a href="#faq" className="hover:text-text">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={SIGNIN}
              className="rounded-sm px-4 py-2 text-small font-semibold text-text hover:bg-bg"
            >
              Sign in
            </Link>
            <Link
              href={SIGNUP}
              className="rounded-sm bg-primary px-4 py-2 text-small font-semibold text-white hover:opacity-95"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#eef2ff] to-bg" />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
          <span className="inline-block rounded-full bg-card px-3 py-1 text-caption font-semibold uppercase tracking-wide text-primary shadow-sm ring-1 ring-border">
            The Global AI Career Growth Ecosystem
          </span>
          <h1 className="mt-6 text-h1 font-extrabold leading-tight md:text-display">
            Accelerate your career with{" "}
            <span className="text-primary">AI</span> and{" "}
            <span className="text-primary">world-class mentors</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-body text-text-secondary">
            Learning, mentorship, community, and AI coaching — in one ecosystem. Join professionals
            worldwide turning daily habits into real career momentum.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={SIGNUP}
              className="w-full rounded-sm bg-primary px-6 py-3 text-body font-semibold text-white hover:opacity-95 sm:w-auto"
            >
              Get started free →
            </Link>
            <a
              href="#how"
              className="w-full rounded-sm border border-border bg-card px-6 py-3 text-body font-semibold text-text hover:border-primary sm:w-auto"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-caption text-text-secondary">
            Free to start · No credit card required
          </p>

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
            <span>Trusted by learners in 40+ countries</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span>Verified expert mentors</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span>Cited AI answers</span>
          </div>
        </div>
      </section>

      {/* ===== Stats ===== */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          {[
            ["40+", "Countries"],
            ["24/7", "AI coaching"],
            ["100%", "Cited answers"],
            ["1", "Ecosystem"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-h2 font-extrabold text-primary">{n}</div>
              <div className="mt-1 text-small text-text-secondary">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2 font-bold">Everything you need to grow, in one place</h2>
          <p className="mt-3 text-body text-text-secondary">
            Three pillars working together — so learning turns into a daily habit and a real career
            outcome.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-md border border-border bg-card p-6 transition hover:border-primary hover:shadow-[0_10px_30px_rgba(15,23,42,.08)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#eef2ff] text-h4 text-primary">
                {p.icon}
              </div>
              <h3 className="mt-4 text-h4 font-bold">{p.title}</h3>
              <p className="mt-2 text-small text-text-secondary">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h2 font-bold">From goal to growth in three steps</h2>
            <p className="mt-3 text-body text-text-secondary">
              Set up in minutes. Grow every day.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-md border border-border bg-bg p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-body font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 text-h4 font-bold">{s.title}</h3>
                <p className="mt-2 text-small text-text-secondary">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={SIGNUP}
              className="inline-block rounded-sm bg-primary px-6 py-3 text-body font-semibold text-white hover:opacity-95"
            >
              Set your goal →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Testimonials ===== */}
      <section id="stories" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2 font-bold">Careers, moving forward</h2>
          <p className="mt-3 text-body text-text-secondary">
            Real momentum from members around the world.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-md border border-border bg-card p-6">
              <blockquote className="text-small leading-relaxed text-text">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.grad} text-caption font-bold text-white`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-small font-bold">{t.name}</div>
                  <div className="text-caption text-text-secondary">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="border-t border-border bg-card">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="text-center text-h2 font-bold">Frequently asked</h2>
          <div className="mt-10 divide-y divide-border">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-body font-semibold">
                  {f.q}
                  <span className="ml-4 text-text-secondary transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-small text-text-secondary">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-xl bg-gradient-to-br from-primary to-dark-bg px-8 py-16 text-center text-white md:px-16">
          <h2 className="text-h2 font-extrabold leading-tight">
            Your next career move starts today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-[#c7d2fe]">
            Join a global community of professionals, mentors, and AI coaches. Set your goal and take
            the first step in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={SIGNUP}
              className="w-full rounded-sm bg-white px-6 py-3 text-body font-semibold text-primary hover:opacity-95 sm:w-auto"
            >
              Get started free →
            </Link>
            <Link
              href={SIGNIN}
              className="w-full rounded-sm border border-white/30 px-6 py-3 text-body font-semibold text-white hover:bg-white/10 sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-caption text-text-secondary md:flex-row">
          <div className="text-body font-black text-text">
            ASCEND<span className="text-primary">R</span>
          </div>
          <div className="text-center md:text-left">
            Rise. Learn. Connect. Lead. · The Global AI Career Growth Ecosystem
          </div>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-text">Features</a>
            <a href="#faq" className="hover:text-text">FAQ</a>
            <Link href={SIGNUP} className="font-semibold text-primary hover:opacity-80">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
