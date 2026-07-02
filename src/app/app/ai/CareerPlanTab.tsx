"use client";

import { useState } from "react";

type Step = { title: string; detail: string; done: boolean };
type Plan = {
  id: string;
  goal: string;
  horizon: string | null;
  summary: string | null;
  steps: Step[];
  created_at: string;
};

const HORIZONS = ["30 days", "90 days", "6 months", "1 year"];

export default function CareerPlanTab({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [goal, setGoal] = useState("");
  const [horizon, setHorizon] = useState("90 days");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local step-completion (progress is per-plan, persisted best-effort).
  const [checked, setChecked] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(initialPlans.map((p) => [p.id, p.steps.map((s) => s.done)]))
  );

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/career-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, horizon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate plan");
      setPlans((prev) => [data.plan, ...prev]);
      setChecked((prev) => ({ ...prev, [data.plan.id]: data.plan.steps.map(() => false) }));
      setGoal("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggleStep(planId: string, i: number) {
    setChecked((prev) => {
      const arr = [...(prev[planId] ?? [])];
      arr[i] = !arr[i];
      // Best-effort persist (fire and forget).
      fetch("/api/ai/career-plan/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, index: i, done: arr[i] }),
      }).catch(() => {});
      return { ...prev, [planId]: arr };
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      {/* New plan */}
      <form onSubmit={generate} className="h-fit rounded-md border border-border bg-card p-4">
        <div className="text-caption font-bold uppercase tracking-wide text-text-secondary">
          Build a plan
        </div>
        <label className="mt-3 block text-small font-semibold">Your goal</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          placeholder="e.g. Move from freelance web dev into a product manager role"
          className="mt-1 w-full rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
        />
        <label className="mt-3 block text-small font-semibold">Time horizon</label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {HORIZONS.map((h) => (
            <button
              type="button"
              key={h}
              onClick={() => setHorizon(h)}
              className={`rounded-full border px-3 py-1 text-caption font-semibold ${
                horizon === h ? "border-primary bg-[#eef2ff] text-primary" : "border-border text-text-secondary"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!goal.trim() || loading}
          className="mt-4 w-full rounded-sm bg-primary px-4 py-2.5 text-small font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Building your plan…" : "Generate plan"}
        </button>
        {error && <p className="mt-2 text-caption text-danger">{error}</p>}
      </form>

      {/* Saved plans */}
      <div className="flex flex-col gap-4">
        {plans.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-card p-10 text-center text-text-secondary">
            No plans yet. Set a goal and generate your first career plan.
          </div>
        )}
        {plans.map((plan) => {
          const marks = checked[plan.id] ?? plan.steps.map((s) => s.done);
          const done = marks.filter(Boolean).length;
          const pct = plan.steps.length ? Math.round((done / plan.steps.length) * 100) : 0;
          return (
            <div key={plan.id} className="rounded-md border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{plan.goal}</h3>
                  {plan.summary && <p className="mt-1 text-small text-text-secondary">{plan.summary}</p>}
                </div>
                {plan.horizon && (
                  <span className="shrink-0 rounded-full bg-[#eef2ff] px-2.5 py-1 text-caption font-semibold text-primary">
                    {plan.horizon}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-caption font-semibold text-text-secondary">{pct}%</span>
              </div>

              <ol className="mt-4 space-y-2">
                {plan.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={!!marks[i]}
                      onChange={() => toggleStep(plan.id, i)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#10B981]"
                    />
                    <div>
                      <div className={`text-small font-semibold ${marks[i] ? "text-text-secondary line-through" : ""}`}>
                        {s.title}
                      </div>
                      {s.detail && <div className="text-caption text-text-secondary">{s.detail}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
