"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { track } from "@/lib/analytics";
import { OUTCOME_VALUES } from "@/lib/career/outcomes";
import { backWithToast } from "@/lib/toast";

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
  revalidatePath("/app");
  if (error == null) backWithToast("Skill added to your profile", "/app/career");
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
  revalidatePath("/app/outcomes");
  if (error == null) backWithToast("Win logged. Nice work.", "/app/outcomes");
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
  revalidatePath("/app/outcomes");
}

// ---------------------------------------------------------------------------
// Roadmap steps — 30/60/90-day plan (lib/career/roadmap.ts)
// ---------------------------------------------------------------------------

/**
 * Tick or untick one roadmap step. Stored as a career_actions row so it counts
 * toward the "action within 7 days" metric. Toggling off deletes the row,
 * which keeps the metric honest if a member clicks by mistake.
 */
export async function togglePlanStep(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile == null) return;

  const stepKey = String(formData.get("step_key") ?? "").slice(0, 120);
  const goalId = String(formData.get("goal_id") ?? "") || null;
  const skillId = String(formData.get("skill_id") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim().slice(0, 200) || "Completed a roadmap step";
  const isDone = String(formData.get("done") ?? "") === "1";
  if (stepKey.length === 0) return;

  const supabase = createClient();

  if (isDone) {
    await supabase
      .from("career_actions")
      .delete()
      .eq("user_id", profile.id)
      .eq("related_type", "plan_step")
      .eq("detail", stepKey);
  } else {
    const { error } = await supabase.from("career_actions").insert({
      user_id: profile.id,
      goal_id: goalId,
      kind: "plan_step_completed",
      title,
      detail: stepKey,
      skill_id: skillId,
      related_type: "plan_step",
      status: "completed",
      suggested_by: "system",
    });
    if (error == null) {
      await track("plan_step_completed", { userId: profile.id, props: { step: stepKey.split(":")[1] ?? "" } });
    }
  }

  revalidatePath("/app/career");
  revalidatePath("/app");
  if (isDone === false) backWithToast("Step completed. That counts as a career action.", "/app/career");
}
