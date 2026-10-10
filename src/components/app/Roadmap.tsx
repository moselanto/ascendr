import type { Roadmap as RoadmapT } from "@/lib/career/roadmap";
import { togglePlanStep, markSkillHeld } from "@/app/app/career/actions";

/**
 * 30 / 60 / 90-day roadmap UI. Server component: every tick is a server
 * action, so it works without client JavaScript.
 */

const KIND_LABEL = { learn: "Learn", practice: "Practice", people: "People" } as const;

const STATUS_STYLE = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-800",
  current: "border-ink bg-ink text-white",
  upcoming: "border-border bg-surface text-text-secondary",
} as const;

const STATUS_LABEL = { done: "Done", current: "Now", upcoming: "Up next" } as const;

export function Roadmap({
  roadmap,
  goalId,
  roleTitle,
}: {
  roadmap: RoadmapT;
  goalId: string;
  roleTitle: string;
}) {
  const pct = roadmap.total > 0 ? Math.round((roadmap.done / roadmap.total) * 100) : 0;

  return (
    <section id="roadmap" className="scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[20px] font-semibold tracking-tight">Your 90-day roadmap</h2>
          <p className="mt-1 max-w-xl text-[14px] text-text-secondary">
            Built from the core skills for {roleTitle} you don&apos;t have yet, most important first. Tick steps as you
            go. Each one counts as a career action.
          </p>
        </div>
        <div className="min-w-[180px]">
          <div className="flex justify-between text-[12px] text-text-secondary">
            <span>
              <span className="nums font-semibold text-text">{roadmap.done}</span> of {roadmap.total} steps
            </span>
            <span className="nums">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-surface">
            <div className="h-1.5 rounded-full bg-ink" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <ol className="mt-6 space-y-5">
        {roadmap.phases.map((phase) => (
          <li key={phase.label} className="rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${STATUS_STYLE[phase.status]}`}>
                  {STATUS_LABEL[phase.status]}
                </span>
                <span className="font-semibold text-text">{phase.label}</span>
                <span className="hidden text-[12px] text-text-secondary sm:inline">{phase.window}</span>
              </div>
              <span className="nums text-[12px] text-text-secondary">
                {phase.done}/{phase.total}
              </span>
            </div>

            <div className="divide-y divide-border">
              {phase.skills.map((skill) => (
                <div key={skill.skillId} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-text">{skill.label}</p>
                    {skill.complete && (
                      <form action={markSkillHeld}>
                        <input type="hidden" name="skill_id" value={skill.skillId} />
                        <input type="hidden" name="goal_id" value={goalId} />
                        <button className="rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white hover:bg-ink-700">
                          All steps done: add to my skills
                        </button>
                      </form>
                    )}
                  </div>

                  <ul className="mt-3 space-y-2">
                    {skill.steps.map((step) => (
                      <li key={step.key}>
                        <form action={togglePlanStep} className="flex items-start gap-3">
                          <input type="hidden" name="step_key" value={step.key} />
                          <input type="hidden" name="goal_id" value={goalId} />
                          <input type="hidden" name="skill_id" value={skill.skillId} />
                          <input type="hidden" name="title" value={step.title} />
                          <input type="hidden" name="done" value={step.done ? "1" : "0"} />
                          <button
                            aria-label={step.done ? `Mark not done: ${step.title}` : `Mark done: ${step.title}`}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xl border text-[12px] transition-colors ${
                              step.done ? "border-ink bg-ink text-white" : "border-border bg-white hover:border-ink"
                            }`}
                          >
                            {step.done ? "✓" : ""}
                          </button>
                          <div className="flex-1">
                            <p className={`text-[14px] ${step.done ? "text-text-secondary line-through" : "text-text"}`}>
                              <span className="mr-2 text-[12px] font-medium uppercase tracking-wide text-text-secondary">
                                {KIND_LABEL[step.kind]}
                              </span>
                              {step.title}
                            </p>
                            {step.done ? null : <p className="mt-0.5 text-[12px] text-text-secondary">{step.hint}</p>}
                          </div>
                        </form>
                      </li>
                    ))}
                  </ul>

                  <form action={markSkillHeld} className="mt-3">
                    <input type="hidden" name="skill_id" value={skill.skillId} />
                    <input type="hidden" name="goal_id" value={goalId} />
                    {skill.complete ? null : (
                      <button className="text-[12px] font-medium text-text-secondary underline-offset-2 hover:text-text hover:underline">
                        Already have this skill? Remove it from your plan
                      </button>
                    )}
                  </form>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {roadmap.later > 0 && (
        <p className="mt-4 text-[12px] text-text-secondary">
          +{roadmap.later} more core skills after day 90. They move into the plan as you finish these.
        </p>
      )}
    </section>
  );
}
