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
  const location = String(formData.get("location") || "").trim().slice(0, 80) || null;
  const websiteRaw = String(formData.get("website") || "").trim().slice(0, 200);
  const website = websiteRaw
    ? /^https?:\/\//i.test(websiteRaw)
      ? websiteRaw
      : `https://${websiteRaw}`
    : null;

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
    .update({ ...base, headline, company, location, website })
    .eq("id", profile!.id);

  // Until migration 0014 is applied the headline/company columns don't exist.
  // Save everything else rather than failing the whole form.
  if (error && /location|website/i.test(error.message)) {
    ({ error } = await supabase
      .from("profiles")
      .update({ ...base, headline, company })
      .eq("id", profile!.id));
  }
  if (error && /headline|company/i.test(error.message)) {
    ({ error } = await supabase.from("profiles").update(base).eq("id", profile!.id));
  }

  if (error) {
    redirect(`/app/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/settings");
  redirect("/app/settings?saved=1");
}

type PhotoResult = { ok: true } | { ok: false; error: string };

/** Save an uploaded avatar/cover URL. Only URLs inside the member's own storage folder are accepted. */
export async function savePhoto(kind: "avatar" | "cover", url: string): Promise<PhotoResult> {
  const profile = await getCurrentProfile();
  if (profile == null) return { ok: false, error: "Please sign in again." };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const prefix = `${base}/storage/v1/object/public/avatars/${profile.auth_user_id}/`;
  if (typeof url !== "string" || url.startsWith(prefix) === false) {
    return { ok: false, error: "That image location isn't allowed." };
  }
  const column = kind === "cover" ? "cover_url" : "avatar_url";
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ [column]: url }).eq("id", profile.id);
  if (error) {
    return {
      ok: false,
      error: /cover_url/.test(error.message) ? "Cover photos need migration 0015 to be run." : error.message,
    };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function removePhoto(kind: "avatar" | "cover"): Promise<PhotoResult> {
  const profile = await getCurrentProfile();
  if (profile == null) return { ok: false, error: "Please sign in again." };
  const column = kind === "cover" ? "cover_url" : "avatar_url";
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ [column]: null }).eq("id", profile.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true };
}
