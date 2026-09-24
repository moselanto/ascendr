// Skill gap engine — the computational core of Career Intelligence.
//
// Everything the repositioning promises ("3 skill gaps", "4/5 required skills",
// "why this mentor", "why this opportunity") reduces to one operation: the set
// difference between what a role requires and what a person has.
//
// Deliberately deterministic. The LLM narrates the gap; it does not compute it.
// A model that invents a skill gap is worse than no gap analysis at all, and
// Section 34 (AI Trust) requires every claim here to be traceable to a row.

import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/ai";

export type SkillRef = {
  skillId: string;
  label: string;
  skillType: string | null;
};

export type HeldSkill = SkillRef & {
  proficiency: number | null;
  evidence: string;
};

export type GapSkill = SkillRef & {
  importance: "essential" | "optional";
  weight: number;
};

export type GapAnalysis = {
  goalId: string;
  roleId: string | null;
  roleTitle: string | null;
  held: HeldSkill[];
  matched: SkillRef[];
  gaps: GapSkill[];
  /** Essential-skill coverage, 0..1. Internal ranking signal — do not render raw. */
  coverage: number;
  /** User-facing band. Honest about precision in a way a percentage is not. */
  band: "strong" | "partial" | "stretch" | "unknown";
  transferable: SkillRef[];
};

/**
 * Coverage → band.
 *
 * We deliberately do NOT surface a percentage. A "87% match" implies a
 * calibration this system does not have and cannot defend when a user
 * disagrees. Bands degrade gracefully and are defensible line by line.
 */
export function toBand(coverage: number, essentialCount: number): GapAnalysis["band"] {
  if (essentialCount === 0) return "unknown";
  if (coverage >= 0.75) return "strong";
  if (coverage >= 0.4) return "partial";
  return "stretch";
}

/**
 * Resolve free-text skill strings to canonical skill rows.
 *
 * Two-stage: exact/alias match first (cheap, precise), vector similarity for
 * the remainder (handles "SQL" vs "Structured Query Language" vs "querying
 * relational databases"). Reuses the embedding pipeline already in lib/ai.
 */
export async function resolveSkills(inputs: string[]): Promise<Map<string, SkillRef>> {
  const resolved = new Map<string, SkillRef>();
  if (inputs.length === 0) return resolved;

  const supabase = createClient();
  const cleaned = inputs.map((s) => s.trim()).filter(Boolean);

  // Stage 1 — exact match on preferred label or alias.
  const { data: exact } = await supabase
    .from("skills")
    .select("id, preferred_label, alt_labels, skill_type")
    .or(
      cleaned
        .map((s) => `preferred_label.ilike.${s},alt_labels.cs.{"${s.replace(/"/g, "")}"}`)
        .join(",")
    )
    .limit(500);

  for (const raw of cleaned) {
    const hit = (exact ?? []).find(
      (r) =>
        r.preferred_label.toLowerCase() === raw.toLowerCase() ||
        (r.alt_labels ?? []).some((a: string) => a.toLowerCase() === raw.toLowerCase())
    );
    if (hit) {
      resolved.set(raw, {
        skillId: hit.id,
        label: hit.preferred_label,
        skillType: hit.skill_type,
      });
    }
  }

  // Stage 2 — vector match for whatever is left.
  const unresolved = cleaned.filter((s) => !resolved.has(s));
  if (unresolved.length === 0) return resolved;

  const vectors = await embed(unresolved);
  if (vectors.length !== unresolved.length) return resolved;

  await Promise.all(
    unresolved.map(async (raw, i) => {
      const { data } = await supabase.rpc("match_skills", {
        p_query_embedding: vectors[i],
        p_match_count: 1,
      });
      const top = (data ?? [])[0];
      // 0.62 chosen to be conservative: a wrong canonical mapping silently
      // corrupts every downstream gap, so prefer leaving it unresolved.
      if (top && top.similarity > 0.62) {
        resolved.set(raw, {
          skillId: top.id,
          label: top.preferred_label,
          skillType: top.skill_type,
        });
      }
    })
  );

  return resolved;
}

/**
 * Compute the gap between a member's skills and their goal's target role.
 *
 * Pure set arithmetic over two tables. No model call, no randomness — the same
 * inputs always produce the same analysis, which is what makes it auditable.
 */
export async function analyzeGap(profileId: string, goalId: string): Promise<GapAnalysis | null> {
  const supabase = createClient();

  const { data: goal } = await supabase
    .from("career_goals")
    .select("id, target_role_id, target_title, role_profiles(id, title)")
    .eq("id", goalId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (!goal) return null;

  const roleId = goal.target_role_id as string | null;

  const { data: heldRows } = await supabase
    .from("user_skills")
    .select("skill_id, proficiency, evidence, skills(id, preferred_label, skill_type)")
    .eq("user_id", profileId);

  const held: HeldSkill[] = (heldRows ?? [])
    .filter((r: any) => r.skills)
    .map((r: any) => ({
      skillId: r.skills.id,
      label: r.skills.preferred_label,
      skillType: r.skills.skill_type,
      proficiency: r.proficiency,
      evidence: r.evidence,
    }));

  // No resolved target role yet — report held skills, no gap claim.
  if (!roleId) {
    return {
      goalId,
      roleId: null,
      roleTitle: goal.target_title ?? null,
      held,
      matched: [],
      gaps: [],
      coverage: 0,
      band: "unknown",
      transferable: [],
    };
  }

  const { data: requiredRows } = await supabase
    .from("role_required_skills")
    .select("importance, weight, skills(id, preferred_label, skill_type)")
    .eq("role_id", roleId);

  const required = (requiredRows ?? [])
    .filter((r: any) => r.skills)
    .map((r: any) => ({
      skillId: r.skills.id as string,
      label: r.skills.preferred_label as string,
      skillType: r.skills.skill_type as string | null,
      importance: r.importance as "essential" | "optional",
      weight: Number(r.weight),
    }));

  const heldIds = new Set(held.map((h) => h.skillId));
  const requiredIds = new Set(required.map((r) => r.skillId));

  const matched = required
    .filter((r) => heldIds.has(r.skillId))
    .map(({ skillId, label, skillType }) => ({ skillId, label, skillType }));

  const gaps = required
    .filter((r) => !heldIds.has(r.skillId))
    // Essential before optional, then by weight — this is the ordering the UI
    // uses for "your next best action".
    .sort((a, b) =>
      a.importance === b.importance ? b.weight - a.weight : a.importance === "essential" ? -1 : 1
    );

  // Weighted coverage over essential skills only. Optional skills should not
  // flatter the score.
  const essentials = required.filter((r) => r.importance === "essential");
  const essentialWeight = essentials.reduce((s, r) => s + r.weight, 0);
  const coveredWeight = essentials
    .filter((r) => heldIds.has(r.skillId))
    .reduce((s, r) => s + r.weight, 0);
  const coverage = essentialWeight > 0 ? coveredWeight / essentialWeight : 0;

  // Skills the member has that the role does not list. These power the
  // "your strongest transferable skill" insight rather than being discarded.
  const transferable = held
    .filter((h) => !requiredIds.has(h.skillId) && h.skillType === "transversal")
    .map(({ skillId, label, skillType }) => ({ skillId, label, skillType }));

  return {
    goalId,
    roleId,
    roleTitle: (goal as any).role_profiles?.title ?? goal.target_title ?? null,
    held,
    matched,
    gaps,
    coverage,
    band: toBand(coverage, essentials.length),
    transferable,
  };
}

/**
 * Render the gap as the evidence lines shown under a match band.
 * Plain strings, each traceable to a row — no model involvement.
 */
export function explainMatch(analysis: GapAnalysis): string[] {
  const reasons: string[] = [];
  const essentialTotal = analysis.matched.length + analysis.gaps.filter((g) => g.importance === "essential").length;

  if (essentialTotal > 0) {
    reasons.push(`${analysis.matched.length} of ${essentialTotal} core skills`);
  }
  if (analysis.transferable.length > 0) {
    reasons.push(`Transferable strength in ${analysis.transferable.slice(0, 2).map((t) => t.label).join(" and ")}`);
  }
  for (const gap of analysis.gaps.filter((g) => g.importance === "essential").slice(0, 3)) {
    reasons.push(`Missing: ${gap.label}`);
  }
  return reasons;
}
