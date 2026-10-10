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
  const headline = String(formData.get("headline") || "").trim().slice(0, 120) || null;
  const company = String(formData.get("company") || "").trim().slice(0, 80) || null;

  const goalRaw = String(formData.get("career_goal") || "");
  const goal = (VALID_GOALS as readonly string[]).includes(goalRaw) ? goalRaw : null;

  const rolesRaw = String(formData.get("target_roles") || "");
  const targetRoles = rolesRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 10);

  const supabase = createClient();
  const base = {
    full_name: fullName || null,
    handle,
    bio,
    career_goal: goal,
    target_roles: targetRoles,
  };
  let { error } = await supabase
    .from("profiles")
    .update({ ...base, headline, company })
    .eq("id", profile!.id);

  // Until migration 0014 is applied the headline/company columns don't exist.
  // Save everything else rather than failing the whole form.
  if (error && /headline|company/i.test(error.message)) {
    ({ error } = await supabase.from("profiles").update(base).eq("id", profile!.id));
  }

  if (error) {
    redirect(`/app/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/settings");
  redirect("/app/settings?saved=1");
}
