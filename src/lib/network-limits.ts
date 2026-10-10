/**
 * Read a network's plan and how much of it is used (migration 0019).
 * Returns null when the migration has not been run, so the UI can stay quiet
 * instead of showing wrong numbers. Enforcement itself lives in the database
 * triggers; this is for display and friendly messages only.
 */
import { createClient } from "@/lib/supabase/server";

export type NetworkPlan = "free" | "starter" | "pro" | "unlimited";

export type NetworkUsage = {
  plan: NetworkPlan;
  maxMembers: number | null;
  maxRoles: number | null;
  members: number;
  roles: number;
  membersFull: boolean;
  rolesFull: boolean;
};

export const NETWORK_PLAN_LABEL: Record<NetworkPlan, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  unlimited: "Unlimited",
};

export async function getNetworkUsage(orgId: string): Promise<NetworkUsage | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("org_limits", { p_org: orgId });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { plan: NetworkPlan; max_members: number | null; max_roles: number | null; members: number; roles: number }
    | undefined;
  if (row == null) return null;
  return {
    plan: row.plan,
    maxMembers: row.max_members,
    maxRoles: row.max_roles,
    members: row.members,
    roles: row.roles,
    membersFull: row.max_members != null && row.members >= row.max_members,
    rolesFull: row.max_roles != null && row.roles >= row.max_roles,
  };
}

/** Turn a trigger error into a sentence a network admin can act on. */
export function limitMessage(message: string | undefined | null): string | null {
  if (message == null) return null;
  if (message.includes("plan_limit_members")) return "This network has reached its member limit. An admin can upgrade the plan to add more";
  if (message.includes("plan_limit_roles")) return "Your plan's role limit is reached. Upgrade to Pro for unlimited roles";
  return null;
}
