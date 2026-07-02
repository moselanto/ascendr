"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

const VALID_GOALS = ["switch", "promote", "startup", "learn"] as const;

export async function updateProfile(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const fullName = String(formData.get("full_name") || "").trim();
  const handleRaw = String(formData.get("handle") || "").trim();
  const handle = handleRaw ? handleRaw.replace(/^@/, "").toLowerCase() : null;
  const bio = String(formData.get("bio") || "").trim() || null;

  const goalRaw = String(formData.get("career_goal") || "");
  const goal = (VALID_GOALS as readonly string[]).includes(goalRaw) ? goalRaw : null;

  const rolesRaw = String(formData.get("target_roles") || "");
  const targetRoles = rolesRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 10);

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      handle,
      bio,
      career_goal: goal,
      target_roles: targetRoles,
    })
    .eq("id", profile!.id);

  if (error) {
    redirect(`/app/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/settings");
  redirect("/app/settings?saved=1");
}
