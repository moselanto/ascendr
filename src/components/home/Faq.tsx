const FAQ = [
  {
    q: "Who is ASCENDR for?",
    a: "Professionals, career switchers, founders and students who know roughly where they want to go but not what stands between them and getting there.",
  },
  {
    q: "How is this different from a job board or a course platform?",
    a: "A job board shows you openings. A course platform shows you lessons. Neither knows your goal, so neither can tell you which opening is reachable or which lesson matters first. ASCENDR connects them: your gap decides your learning, your mentors and which roles are worth applying for.",
  },
  {
    q: "How does ASCENDR decide what I'm missing?",
    a: "By comparing the skills on your profile against what your target role actually requires, using a public skills taxonomy rather than a model's opinion. The gap is computed, not generated, so every item traces back to a specific requirement, and the AI explains the result rather than inventing it.",
  },
  {
    q: "Do I need to pay to start?",
    a: "No. Create your account, set a goal, see your gap and explore communities free. Advanced career intelligence and mentor access come with paid plans.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-ink/[0.06] bg-surface">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:py-32 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-[14px] font-medium text-brand-600">FAQ</p>
          <h2 className="mt-3 text-h1 font-semibold text-ink">
            Questions, <span className="accent-serif">answered.</span>
          </h2>
        </div>

        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[19px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/15 text-[18px] text-ink transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-prose text-[16px] leading-relaxed text-text-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
