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
    <section id="faq" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <span className="eyebrow text-caption text-primary">FAQ</span>
        <h2 className="mt-3 text-h2">Frequently asked</h2>

        <div className="mt-12 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-md border border-border bg-white px-6 py-5 transition-colors open:border-brand-200 hover:border-brand-300"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-h4 text-text">
                {item.q}
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-h4 font-normal text-text-secondary transition-transform group-open:rotate-45 group-open:border-brand-200 group-open:text-primary"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-prose text-body text-text-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
