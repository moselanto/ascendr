import Link from "next/link";
import { PILOT_CONTACT, SIGNUP } from "./links";

/**
 * Landing-page FAQ. Every answer describes what the product does today;
 * plan numbers come from the same limits the app enforces (lib/usage,
 * migration 0019). Update this list when pricing or limits change.
 */
type QA = { q: string; a: string };
type Group = { title: string; items: QA[] };

const GROUPS: Group[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "Who is ASCENDR for?",
        a: "Professionals, career switchers, founders and students who know roughly where they want to go but not what stands between them and getting there. Funds, accelerators, universities and associations use ASCENDR Networks to develop and place their members.",
      },
      {
        q: "How is this different from a job board or a course platform?",
        a: "A job board shows you openings. A course platform shows you lessons. Neither knows your goal, so neither can tell you which opening is reachable or which lesson matters first. ASCENDR connects them: your gap decides your learning, your mentors and which roles are worth applying for.",
      },
      {
        q: "How do I get started?",
        a: "Create a free account, choose the role you want next and tick the skills you already have. ASCENDR shows your skills gap straight away and turns it into a 90-day roadmap. It takes a few minutes.",
      },
      {
        q: "Do I need to pay to start?",
        a: "No. The Free plan includes your skills gap for one target role, a 90-day roadmap and learning paths, 25 AI coach messages and 5 mock interviews a day, plus communities, mentors and messaging. Upgrade only when you need more.",
      },
      {
        q: "Do I need to install an app?",
        a: "No. ASCENDR runs in the browser on your phone, tablet or computer. Sign in with the same account everywhere.",
      },
    ],
  },
  {
    title: "Your career plan",
    items: [
      {
        q: "How does ASCENDR decide what I'm missing?",
        a: "By comparing the skills on your profile against what your target role actually requires, using a public skills taxonomy rather than a model's opinion. The gap is computed, not generated, so every item traces back to a specific requirement, and the AI explains the result rather than inventing it.",
      },
      {
        q: "Where does the skills data come from?",
        a: "From ESCO, the European Commission's classification of occupations and skills. It is public, maintained by experts and used by employers and governments, so your gap is based on a recognised standard.",
      },
      {
        q: "What does the AI career coach do?",
        a: "It reviews your CV, runs mock interviews with feedback, builds and explains your career plan, and answers questions in the context of your goal and your gap. Each plan has a daily limit, shown on the pricing page.",
      },
      {
        q: "How do mentors work?",
        a: "ASCENDR suggests mentors and experts who already hold the role you want and cover the skills you are missing. You can connect, message them directly and meet them in communities and live sessions.",
      },
      {
        q: "Will ASCENDR get me a job?",
        a: "No platform can promise that. ASCENDR shows which roles you can realistically reach, scores openings against your skills, tracks your applications and logs your wins. If you belong to a network, it can invite you onto a pathway or introduce you to a hiring company, always with your consent.",
      },
    ],
  },
  {
    title: "Privacy and consent",
    items: [
      {
        q: "Who can see my information?",
        a: "Other members see your public profile: name, photo, headline and role. Your skills gap, roadmap, notes and messages stay private to you.",
      },
      {
        q: "What does a network see if I join it?",
        a: "Only while sharing is on, the network's admins see your career goal, how ready you are for the roles they are hiring for, the skills you are missing and the outcomes you log. They never see your messages or private notes.",
      },
      {
        q: "Can I stop sharing or leave a network?",
        a: "Yes, at any time, from the Network page. Turning sharing off hides your career data from that network straight away.",
      },
      {
        q: "Can a network introduce me to an employer without asking?",
        a: "No. Every introduction is proposed first, and nothing is shared with the company until you give consent.",
      },
    ],
  },
  {
    title: "For networks and organisations",
    items: [
      {
        q: "What is ASCENDR Networks?",
        a: "A workspace for funds, accelerators, universities and associations. Invite your members with one link, add the roles your portfolio or partners are hiring for, and see who is ready now, who is close and which skills are missing. You can invite members onto development pathways, propose consented introductions, track interviews and hires, and download an impact report.",
      },
      {
        q: "How do members join our network?",
        a: "You create an invite link and share it. Members sign up or sign in, join with one click and choose whether to share their career data.",
      },
      {
        q: "How many members and roles can we have?",
        a: "Free: up to 10 members and 1 open role, to try it out. Starter: up to 50 members and 3 roles. Pro: up to 250 members and unlimited roles. Custom: unlimited members and cohorts.",
      },
      {
        q: "What happens when we reach our limit?",
        a: "Nobody is removed. New members and new roles are paused until you upgrade or free up space.",
      },
      {
        q: "Can we run a pilot first?",
        a: "Yes. Contact us and we will set up your network, help you invite your first members and agree what success looks like before you commit to a plan.",
      },
    ],
  },
  {
    title: "Pricing and billing",
    items: [
      {
        q: "How much does ASCENDR cost?",
        a: "Free is KES 0. Starter is KES 13,000 a month and Pro is KES 26,000 a month. Custom plans for universities and large networks are priced to fit. Full details are on the pricing page.",
      },
      {
        q: "How do I pay, and can I cancel?",
        a: "Starter and Pro are billed monthly in KES by card through Paystack. You can update your card or cancel from Billing at any time and keep your plan until the end of the period you paid for.",
      },
      {
        q: "Do you offer annual billing or invoices?",
        a: "Yes, through the Custom plan. Contact us for annual contracts and invoicing.",
      },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

export function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };

  return (
    <section id="faq" className="scroll-mt-20 border-t border-ink/[0.06] bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:py-16 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[14px] font-medium text-brand-600">FAQ</p>
          <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[38px]">
            Questions, <span className="accent-serif">answered.</span>
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-text-secondary">
            Everything members and networks ask before they start. Can&apos;t find yours? Ask us directly.
          </p>
          <nav aria-label="FAQ topics" className="mt-5 flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <a
                key={g.title}
                href={`#faq-${g.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[13px] text-ink hover:border-ink/30"
              >
                {g.title}
              </a>
            ))}
          </nav>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={PILOT_CONTACT} className="rounded-full bg-ink px-4 py-2 text-[14px] font-medium text-white hover:bg-ink-700">
              Ask a question
            </a>
            <Link href={SIGNUP} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-[14px] font-medium text-ink hover:border-ink/40">
              Start free
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {GROUPS.map((g) => (
            <div key={g.title} id={`faq-${g.title.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="scroll-mt-24">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{g.title}</h3>
              <div className="mt-2 divide-y divide-ink/10 border-y border-ink/10">
                {g.items.map((item) => (
                  <details key={item.q} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/15 text-[16px] text-ink transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-text-secondary">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
