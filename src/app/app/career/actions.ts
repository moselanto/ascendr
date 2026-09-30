"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { track } from "@/lib/analytics";
import { OUTCOME_VALUES } from "@/lib/career/outcomes";

/**
 * Mark a required skill as one the member already has.
 *
 * Self-reported evidence only — the gap engine records how each skill was
 * learned so the UI can say "you told us" rather than implying we verified it.
 */
export async function markSkillHeld(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const skillId = String(formData.get("skill_id") ?? "");
  const goalId = String(formData.get("goal_id") ?? "") || null;
  if (!skillId) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("user_skills")
    .upsert(
      { user_id: profile.id, skill_id: skillId, evidence: "self_reported" },
      { onConflict: "user_id,skill_id" }
    );

  if (!error) {
    await supabase.from("career_actions").insert({
      user_id: profile.id,
      goal_id: goalId,
      kind: "profile_updated",
      title: "Added a skill to your profile",
      skill_id: skillId,
      suggested_by: "user",
    });
    await track("skill_added", { userId: profile.id, props: { source: "gap_analysis" } });
  }
  revalidatePath("/app/career");
}

/** Undo a self-reported skill. */
export async function unmarkSkillHeld(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const skillId = String(formData.get("skill_id") ?? "");
  if (!skillId) return;

  const supabase = createClient();
  await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", profile.id)
    .eq("skill_id", skillId)
    .eq("evidence", "self_reported");
  revalidatePath("/app/career");
}

// ---------------------------------------------------------------------------
// Outcomes — the evidence behind the 90-day metric
// ---------------------------------------------------------------------------

/**
 * Record a career outcome.
 *
 * Always stored as self_reported. The schema also allows partner_confirmed and
 * document_verified, and nothing here may claim those: an unverified number in
 * an investor deck is worse than a smaller verified one.
 */
export async function recordOutcome(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const kind = String(formData.get("kind") ?? "");
  if (OUTCOME_VALUES.has(kind) === false) return;

  const goalId = String(formData.get("goal_id") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim().slice(0, 200) || null;
  const organization = String(formData.get("organization") ?? "").trim().slice(0, 200) || null;

  // Accept only a real ISO date that is not in the future; otherwise today.
  const today = new Date().toISOString().slice(0, 10);
  const rawDate = String(formData.get("occurred_on") ?? "");
  const occurredOn = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate <= today ? rawDate : today;

  const supabase = createClient();
  const { error } = await supabase.from("career_outcomes").insert({
    user_id: profile.id,
    goal_id: goalId,
    kind,
    title,
    organization,
    occurred_on: occurredOn,
    verification: "self_reported",
  });

  if (!error) {
    await track("outcome_recorded", { userId: profile.id, props: { kind } });
  }
  revalidatePath("/app/career");
}

/** Remove one of the member's own outcomes (e.g. entered by mistake). */
export async function deleteOutcome(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const id = String(formData.get("outcome_id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("career_outcomes").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/app/career");
}
