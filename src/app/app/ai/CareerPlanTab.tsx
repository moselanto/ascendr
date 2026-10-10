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
    <div className="grid gap-5 md:grid-cols-[320px_1fr]">
      {/* New plan */}
      <form onSubmit={generate} className="h-fit rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Build a plan</p>
        <h2 className="mt-1 text-[17px] font-semibold text-ink">Where do you want to go?</h2>
        <label htmlFor="plan-goal" className="mt-4 block text-[12px] font-medium text-text-secondary">
          Your goal
        </label>
        <textarea
          id="plan-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          placeholder="e.g. Move from freelance web dev into a product manager role"
          className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
        />
        <p className="mt-4 text-[12px] font-medium text-text-secondary">Time horizon</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {HORIZONS.map((h) => (
            <button
              type="button"
              key={h}
              onClick={() => setHorizon(h)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                horizon === h
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-white text-text-secondary hover:border-ink/40"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!goal.trim() || loading}
          className="mt-5 w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50"
        >
          {loading ? "Building your plan…" : "Generate plan →"}
        </button>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </form>

      {/* Saved plans */}
      <div className="flex flex-col gap-4">
        {plans.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <p className="text-[15px] font-semibold text-ink">No plans yet</p>
            <p className="mt-1 text-[14px] text-text-secondary">
              Describe a goal and pick a horizon. Your coach will turn it into concrete, checkable steps.
            </p>
            <button
              type="button"
              onClick={() => document.getElementById("plan-goal")?.focus()}
              className="mt-4 rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
            >
              Write my goal
            </button>
          </div>
        )}
        {plans.map((plan) => {
          const marks = checked[plan.id] ?? plan.steps.map((s) => s.done);
          const done = marks.filter(Boolean).length;
          const pct = plan.steps.length ? Math.round((done / plan.steps.length) * 100) : 0;
          return (
            <div key={plan.id} className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">{plan.goal}</h3>
                  {plan.summary && <p className="mt-1 text-[14px] text-text-secondary">{plan.summary}</p>}
                </div>
                {plan.horizon && (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700">
                    {plan.horizon}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[12px] font-medium text-text-secondary">
                  {done}/{plan.steps.length} · {pct}%
                </span>
              </div>

              <ol className="mt-4 divide-y divide-border rounded-xl border border-border">
                {plan.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!marks[i]}
                      onChange={() => toggleStep(plan.id, i)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#10B981]"
                      aria-label={`Mark "${s.title}" done`}
                    />
                    <div>
                      <div
                        className={`text-[14px] font-medium ${
                          marks[i] ? "text-text-secondary line-through" : "text-ink"
                        }`}
                      >
                        {s.title}
                      </div>
                      {s.detail && <div className="mt-0.5 text-[13px] text-text-secondary">{s.detail}</div>}
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
