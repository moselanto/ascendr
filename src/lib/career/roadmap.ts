import type { GapSkill } from "@/lib/career/gap";

/**
 * 30 / 60 / 90-day roadmap (PRD section 4.1, MVP "Career Roadmap" screen).
 *
 * Built deterministically from the computed gap list: no model call, so the
 * same gaps always give the same plan, and every step traces back to one
 * missing skill. The first six core gaps are spread across three phases in
 * priority order; anything beyond that is shown as "after 90 days".
 *
 * Each skill gets three concrete steps: learn it, use it on real work, and
 * talk to someone who uses it daily. Completion is stored in career_actions
 * (kind = plan_step_completed, related_type = plan_step, detail = step key),
 * so it feeds the 7-day action metric without a schema change.
 */

export type StepKind = "learn" | "practice" | "people";

export type RoadmapStep = {
  key: string;
  kind: StepKind;
  title: string;
  hint: string;
  done: boolean;
};

export type RoadmapSkill = {
  skillId: string;
  label: string;
  steps: RoadmapStep[];
  complete: boolean;
};

export type RoadmapPhase = {
  label: string;
  window: string;
  skills: RoadmapSkill[];
  done: number;
  total: number;
  status: "done" | "current" | "upcoming";
};

export type Roadmap = {
  phases: RoadmapPhase[];
  later: number;
  done: number;
  total: number;
};

const MAX_IN_PLAN = 6;

export function stepKey(skillId: string, kind: StepKind) {
  return `${skillId}:${kind}`;
}

function stepsFor(skillId: string, label: string, completed: Set<string>): RoadmapStep[] {
  const defs: { kind: StepKind; title: string; hint: string }[] = [
    {
      kind: "learn",
      title: `Learn the fundamentals of ${label.toLowerCase()}`,
      hint: "Finish one focused course module, guide or book chapter. Depth over breadth.",
    },
    {
      kind: "practice",
      title: `Use ${label.toLowerCase()} on real work`,
      hint: "A work task, side project or volunteer piece you can point to in an interview.",
    },
    {
      kind: "people",
      title: `Talk to someone who uses ${label.toLowerCase()} every day`,
      hint: "Ask a mentor or community member how they learned it and what good looks like.",
    },
  ];
  return defs.map((d) => {
    const key = stepKey(skillId, d.kind);
    return { key, kind: d.kind, title: d.title, hint: d.hint, done: completed.has(key) };
  });
}

export function buildRoadmap(essentialGaps: GapSkill[], completed: Set<string>): Roadmap {
  const inPlan = essentialGaps.slice(0, MAX_IN_PLAN);
  const n = inPlan.length;

  const buckets: RoadmapSkill[][] = [[], [], []];
  inPlan.forEach((g, i) => {
    const phase = Math.min(2, Math.floor((i * 3) / Math.max(n, 1)));
    const steps = stepsFor(g.skillId, g.label, completed);
    buckets[phase].push({
      skillId: g.skillId,
      label: g.label,
      steps,
      complete: steps.every((s) => s.done),
    });
  });

  const meta = [
    { label: "First 30 days", window: "Days 1-30" },
    { label: "Next 30 days", window: "Days 31-60" },
    { label: "Final 30 days", window: "Days 61-90" },
  ];

  let currentFound = false;
  const phases: RoadmapPhase[] = buckets.map((skills, i) => {
    const total = skills.reduce((s, k) => s + k.steps.length, 0);
    const done = skills.reduce((s, k) => s + k.steps.filter((x) => x.done).length, 0);
    let status: RoadmapPhase["status"] = "upcoming";
    if (total > 0 && done === total) status = "done";
    else if (currentFound === false && total > 0) {
      status = "current";
      currentFound = true;
    }
    return { ...meta[i], skills, done, total, status };
  });

  return {
    phases: phases.filter((p) => p.total > 0),
    later: Math.max(0, essentialGaps.length - n),
    done: phases.reduce((s, p) => s + p.done, 0),
    total: phases.reduce((s, p) => s + p.total, 0),
  };
}
