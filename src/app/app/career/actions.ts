"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { track } from "@/lib/analytics";

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
