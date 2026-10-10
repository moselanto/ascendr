/**
 * Credibility facts that are true today. No customer logos or user counts
 * until there are real ones to show.
 */
const FACTS = [
  { title: "Real role requirements", body: "Skills data from the European Commission's ESCO framework" },
  { title: "Computed, not guessed", body: "Every gap traces to a specific requirement" },
  { title: "Consent first", body: "Members choose what any network can see" },
  { title: "Built for Africa, ready for the world", body: "Local payments, global skills standard" },
];

export function TrustStrip() {
  return (
    <section aria-label="Why people trust ASCENDR" className="border-y border-ink/[0.06] bg-white">
      <div className="mx-auto grid max-w-6xl gap-px bg-ink/[0.06] sm:grid-cols-2 lg:grid-cols-4">
        {FACTS.map((f) => (
          <div key={f.title} className="bg-white px-6 py-6">
            <p className="text-[15px] font-semibold text-ink">{f.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-text-secondary">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
