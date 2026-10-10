"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { track } from "@/lib/analytics";

const VALID_GOALS = ["switch", "promote", "startup", "learn"] as const;

export async function completeOnboarding(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const goalRaw = String(formData.get("career_goal") || "");
  const goal = (VALID_GOALS as readonly string[]).includes(goalRaw) ? goalRaw : null;

  const rolesRaw = String(formData.get("target_roles") || "");
  const targetRoles = rolesRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 10);

  // Stepped-flow extras. current_role and skills are not persisted yet (no
  // columns for them); they inform analytics only. horizon_months is stored
  // on the goal row, which already has that column.
  const currentRole = String(formData.get("current_role") || "").trim().slice(0, 120);
  const skills = String(formData.get("skills") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);
  const horizonRaw = Number(formData.get("horizon_months") || 0);
  const horizonMonths = [3, 6, 12, 24].includes(horizonRaw) ? horizonRaw : null;

  const supabase = createClient();

  // Keep the denormalised columns on profiles: existing UI still reads them,
  // and migration 0008 defined them.
  await supabase
    .from("profiles")
    .update({
      career_goal: goal,
      target_roles: targetRoles,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", profile!.id);

  // Also create the first-class goal row.
  //
  // Migration 0011 promoted career goals to their own table and backfilled
  // existing profiles, but nothing was writing new rows — so every user who
  // onboarded after 0011 would have had a goal on `profiles` and no matching
  // `career_goals` record. Gap analysis, the career plan and the activation
  // metric all key off `career_goals`, so without this they would silently
  // see nothing.
  //
  // target_role_id stays null until the free-text title can be resolved
  // against role_profiles, which needs the ESCO seed. analyzeGap() handles a
  // null target role by returning band "unknown" rather than failing.
  // Resolve the chosen title to a real role so gap analysis works from day one.
  let targetRoleId: string | null = null;
  if (targetRoles[0]) {
    const { data: role } = await supabase
      .from("role_profiles")
      .select("id")
      .ilike("title", targetRoles[0])
      .limit(1)
      .maybeSingle();
    targetRoleId = role?.id ?? null;
  }

  // One active goal per member: update it if it exists, otherwise create it.
  const goalRow = {
    kind: goal ?? "switch",
    target_title: targetRoles[0] ?? null,
    target_role_id: targetRoleId,
    ...(horizonMonths ? { horizon_months: horizonMonths } : {}),
  };
  const { data: existing } = await supabase
    .from("career_goals")
    .select("id")
    .eq("user_id", profile!.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (existing) {
    await supabase.from("career_goals").update(goalRow).eq("id", existing.id);
  } else if (goal || targetRoles[0]) {
    await supabase.from("career_goals").insert({ user_id: profile!.id, ...goalRow });
  }

  // Career activation — the first of the four metrics in PRD.md section 10.
  // Awaited, not fire-and-forget: redirect() throws internally to unwind, so
  // anything left pending here would be dropped.
  await track("goal_created", {
    userId: profile!.id,
    props: {
      kind: goal ?? "none",
      target_role_count: targetRoles.length,
      has_target_role: targetRoles.length > 0,
      has_current_role: currentRole.length > 0,
      skill_count: skills.length,
      horizon_months: horizonMonths ?? 0,
    },
  });

  redirect("/app");
}
