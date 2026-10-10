"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { track } from "@/lib/analytics";

/** Save the skills the member ticked after a CV import (evidence: resume). */
export async function saveCvSkills(skillIds: string[]): Promise<{ ok: boolean; saved: number }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, saved: 0 };
  const ids = Array.from(new Set(skillIds.filter((s) => /^[0-9a-f-]{36}$/i.test(s)))).slice(0, 40);
  if (ids.length === 0) return { ok: true, saved: 0 };

  const supabase = await createClient();
  const { error } = await supabase.from("user_skills").upsert(
    ids.map((skill_id) => ({ user_id: profile.id, skill_id, evidence: "resume", confidence: 0.8 })),
    { onConflict: "user_id,skill_id" }
  );
  if (error) return { ok: false, saved: 0 };

  await supabase.from("career_actions").insert({
    user_id: profile.id,
    kind: "profile_updated",
    title: `Added ${ids.length} skills from your CV`,
    suggested_by: "user",
  });
  await track("skill_added", { userId: profile.id, props: { source: "cv_import", count: ids.length } });
  revalidatePath("/app/career");
  revalidatePath("/app");
  return { ok: true, saved: ids.length };
}

/** Make a catalogue role the member's active goal. */
export async function setGoalFromCv(roleId: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile || !roleId) return { ok: false };
  const supabase = await createClient();
  const { data: role } = await supabase.from("role_profiles").select("id, title").eq("id", roleId).maybeSingle();
  if (!role) return { ok: false };

  const row = { target_title: role.title, target_role_id: role.id };
  const { data: existing } = await supabase
    .from("career_goals")
    .select("id")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("career_goals").update(row).eq("id", existing.id)
    : await supabase.from("career_goals").insert({ user_id: profile.id, kind: "switch", ...row });
  revalidatePath("/app/career");
  revalidatePath("/app");
  return { ok: error == null };
}
