"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

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
  await supabase
    .from("profiles")
    .update({
      career_goal: goal,
      target_roles: targetRoles,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", profile!.id);

  redirect("/app");
}
