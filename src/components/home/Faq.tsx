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
    a: "By comparing the skills on your profile against what your target role actually requires, using a public skills taxonomy rather than a model's opinion. The gap is computed, not generated — so every item traces back to a specific requirement, and the AI explains the result rather than inventing it.",
  },
  {
    q: "Do I need to pay to start?",
    a: "No. Create your account, set a goal, see your gap and explore communities free. Advanced career intelligence and mentor access come with paid plans.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-border bg-card">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-24">
        <h2 className="font-display text-h2">Frequently asked</h2>

        <div className="mt-10 divide-y divide-border border-y border-border">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-body font-semibold">
                {item.q}
                <span
                  aria-hidden
                  className="shrink-0 text-h4 font-normal text-text-secondary transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-small leading-relaxed text-text-secondary">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
