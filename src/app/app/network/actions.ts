"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

/**
 * ASCENDR Networks server actions. Writes that need elevated rights
 * (creating an org with its first admin, accepting an invite, changing
 * one's own sharing flag) go through SECURITY DEFINER functions in
 * migration 0013; everything else relies on org-scoped RLS.
 */

const KINDS = new Set(["vc_fund", "accelerator", "university", "association", "company", "other"]);

function s(v: FormDataEntryValue | null, max = 200) {
  return String(v ?? "").trim().slice(0, max);
}

export async function createOrganization(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile == null) redirect("/login");
  const name = s(formData.get("name"), 120);
  const kind = s(formData.get("kind"), 20);
  if (name.length < 2) return;
  const supabase = createClient();
  const { data } = await supabase.rpc("create_organization", { p_name: name, p_kind: KINDS.has(kind) ? kind : "other" });
  revalidatePath("/app/network");
  if (data) redirect(`/app/network?org=${data}`);
}

export async function createInvite(formData: FormData) {
  const org = s(formData.get("org"), 60);
  const label = s(formData.get("label"), 80) || null;
  if (org.length === 0) return;
  const profile = await getCurrentProfile();
  const supabase = createClient();
  await supabase.from("organization_invites").insert({ organization_id: org, label, created_by: profile?.id ?? null });
  revalidatePath("/app/network");
}

export async function revokeInvite(formData: FormData) {
  const id = s(formData.get("id"), 60);
  if (id.length === 0) return;
  const supabase = createClient();
  await supabase.from("organization_invites").delete().eq("id", id);
  revalidatePath("/app/network");
}

export async function acceptInvite(formData: FormData) {
  const code = s(formData.get("code"), 80);
  if (code.length === 0) return;
  const profile = await getCurrentProfile();
  if (profile == null) redirect("/login");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("accept_org_invite", { p_code: code });
  if (error || data == null) redirect(`/app/network/join?code=${encodeURIComponent(code)}&error=1`);
  revalidatePath("/app/network");
  redirect(`/app/network?org=${data}`);
}

export async function addOrgRole(formData: FormData) {
  const org = s(formData.get("org"), 60);
  const roleId = s(formData.get("role_profile_id"), 60);
  const company = s(formData.get("company"), 120);
  const openings = Math.max(1, Math.min(500, Number(formData.get("openings") ?? 1) || 1));
  if (org.length === 0 || roleId.length === 0 || company.length === 0) return;
  const supabase = createClient();
  await supabase.from("organization_roles").insert({ organization_id: org, role_profile_id: roleId, company, openings });
  revalidatePath("/app/network");
}

export async function removeOrgRole(formData: FormData) {
  const id = s(formData.get("id"), 60);
  if (id.length === 0) return;
  const supabase = createClient();
  await supabase.from("organization_roles").delete().eq("id", id);
  revalidatePath("/app/network");
}

export async function removeOrgMember(formData: FormData) {
  const org = s(formData.get("org"), 60);
  const user = s(formData.get("user_id"), 60);
  if (org.length === 0 || user.length === 0) return;
  const supabase = createClient();
  await supabase.from("organization_members").delete().eq("organization_id", org).eq("user_id", user);
  revalidatePath("/app/network");
}

export async function setSharing(formData: FormData) {
  const org = s(formData.get("org"), 60);
  const share = s(formData.get("share"), 5) === "1";
  if (org.length === 0) return;
  const supabase = createClient();
  await supabase.rpc("set_org_sharing", { p_org: org, p_share: share });
  revalidatePath("/app/network");
}

export async function leaveOrganization(formData: FormData) {
  const org = s(formData.get("org"), 60);
  const profile = await getCurrentProfile();
  if (org.length === 0 || profile == null) return;
  const supabase = createClient();
  await supabase.from("organization_members").delete().eq("organization_id", org).eq("user_id", profile.id);
  revalidatePath("/app/network");
  redirect("/app/network");
}
