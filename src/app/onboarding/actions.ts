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
  if (goal) {
    const { data: existing } = await supabase
      .from("career_goals")
      .select("id")
      .eq("user_id", profile!.id)
      .eq("status", "active")
      .maybeSingle();

    if (!existing) {
      await supabase.from("career_goals").insert({
        user_id: profile!.id,
        kind: goal,
        target_title: targetRoles[0] ?? null,
      });
    }
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
    },
  });

  redirect("/app");
}
