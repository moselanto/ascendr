"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { backWithToast } from "@/lib/toast";

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
  if (data) redirect(`/app/network?org=${data}&toast=${encodeURIComponent("Network created")}`);
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
  redirect(`/app/network?org=${data}&toast=${encodeURIComponent("Welcome to the network")}`);
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

/* ---------------------------------------------------------------- pilot workflow (migration 0016) */

function explain(res: { data: unknown; error: { message: string } | null }, ok: string): string {
  if (res.error) {
    return /function|relation|does not exist/i.test(res.error.message)
      ? "Run migration 0016 in Supabase to enable this"
      : `Could not save: ${res.error.message}`;
  }
  const code = String(res.data ?? "");
  if (code === "ok") return ok;
  if (code === "not_sharing") return "This member isn't sharing career data with the network";
  if (code === "exists") return "An introduction for this role is already in progress";
  if (code === "invalid") return "That step isn't available yet";
  return "You don't have permission to do that";
}

export async function inviteToPathway(formData: FormData) {
  const role = s(formData.get("org_role_id"), 60);
  const member = s(formData.get("member_id"), 60);
  if (role.length === 0 || member.length === 0) return;
  const supabase = createClient();
  const res = await supabase.rpc("org_invite_pathway", { p_role: role, p_member: member, p_note: s(formData.get("note"), 500) || null });
  revalidatePath("/app/network");
  backWithToast(explain(res, "Pathway invite sent"), "/app/network");
}

export async function proposeIntro(formData: FormData) {
  const role = s(formData.get("org_role_id"), 60);
  const member = s(formData.get("member_id"), 60);
  if (role.length === 0 || member.length === 0) return;
  const supabase = createClient();
  const res = await supabase.rpc("org_propose_intro", { p_role: role, p_member: member, p_note: s(formData.get("note"), 500) || null });
  revalidatePath("/app/network");
  backWithToast(explain(res, "Introduction proposed. Waiting for the member's consent"), "/app/network");
}

export async function advanceIntro(formData: FormData) {
  const id = s(formData.get("id"), 60);
  const status = s(formData.get("status"), 20);
  if (id.length === 0 || ["introduced", "interviewing", "hired", "closed"].includes(status) === false) return;
  const supabase = createClient();
  const res = await supabase.rpc("org_advance_intro", { p_id: id, p_status: status });
  revalidatePath("/app/network");
  revalidatePath("/app/outcomes");
  backWithToast(explain(res, status === "closed" ? "Introduction closed" : "Pipeline updated and outcome recorded"), "/app/network");
}

export async function respondToPathway(formData: FormData) {
  const id = s(formData.get("id"), 60);
  const accept = s(formData.get("accept"), 5) === "1";
  if (id.length === 0) return;
  const supabase = createClient();
  const res = await supabase.rpc("respond_pathway", { p_id: id, p_accept: accept });
  revalidatePath("/app/network");
  revalidatePath("/app/career");
  revalidatePath("/app");
  backWithToast(explain(res, accept ? "Pathway accepted. It's now your career goal" : "Pathway declined"), "/app/network");
}

export async function respondToIntro(formData: FormData) {
  const id = s(formData.get("id"), 60);
  const consent = s(formData.get("consent"), 5) === "1";
  if (id.length === 0) return;
  const supabase = createClient();
  const res = await supabase.rpc("respond_intro", { p_id: id, p_consent: consent });
  revalidatePath("/app/network");
  backWithToast(explain(res, consent ? "Consent given. The network will make the introduction" : "Introduction declined"), "/app/network");
}
