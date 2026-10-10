import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Two-factor sign-in (TOTP authenticator app) for platform admins.
 *
 * Supabase Auth issues sessions at assurance level aal1 (password) or aal2
 * (password + authenticator code). Admin pages and admin actions require
 * aal2. An admin with no authenticator yet is sent to Settings to add one;
 * an admin with one who has not entered a code this session is sent to
 * /login/mfa.
 */
export type MfaState = "ok" | "enroll" | "verify";

export async function getMfaState(): Promise<MfaState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data == null) return "enroll";
  if (data.currentLevel === "aal2") return "ok";
  return data.nextLevel === "aal2" ? "verify" : "enroll";
}

/** Call at the top of every admin page and admin server action. */
export async function requireAdminMfa(next = "/app/admin"): Promise<void> {
  const state = await getMfaState();
  if (state === "enroll") redirect("/app/settings?mfa=required#security");
  if (state === "verify") redirect(`/login/mfa?next=${encodeURIComponent(next)}`);
}
