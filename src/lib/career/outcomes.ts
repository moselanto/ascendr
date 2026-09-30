// Career outcome kinds, shared by the server actions and the page.
//
// Lives outside actions.ts on purpose: a "use server" module may only export
// async functions, and exporting this constant from there fails `next build`.
// Values must match the career_outcomes.kind check constraint in 0011.

export const OUTCOME_KINDS = [
  { value: "interview", label: "Got an interview" },
  { value: "offer", label: "Received an offer" },
  { value: "job_started", label: "Started a new job" },
  { value: "promotion", label: "Got promoted" },
  { value: "raise", label: "Got a raise" },
  { value: "introduction_made", label: "Got an introduction" },
  { value: "skill_certified", label: "Earned a certification" },
  { value: "project_won", label: "Won a project or client" },
  { value: "funding_raised", label: "Raised funding" },
] as const;

export const OUTCOME_VALUES = new Set<string>(OUTCOME_KINDS.map((k) => k.value));

export function outcomeLabel(kind: string): string {
  return OUTCOME_KINDS.find((k) => k.value === kind)?.label ?? kind;
}
