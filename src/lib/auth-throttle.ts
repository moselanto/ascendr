import crypto from "crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sign-in and sign-up throttling (migration 0026, SECURITY-AUDIT M-3).
 *
 * Each attempt counts against its IP and, for sign-in, the email address.
 * Keys are hashed before storage. Fails OPEN if the table or service key is
 * missing, so a database problem never locks everyone out; Supabase Auth's
 * own rate limits still apply underneath.
 */

export const THROTTLE_MESSAGE = "Too many attempts. Please wait 15 minutes and try again.";

const RULES = {
  loginIp: { limit: 20, windowSecs: 900 },
  loginEmail: { limit: 8, windowSecs: 900 },
  signupIp: { limit: 5, windowSecs: 3600 },
} as const;

function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

function hash(v: string) {
  return crypto.createHash("sha256").update(v).digest("hex");
}

async function hit(key: string, rule: { limit: number; windowSecs: number }): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("auth_throttle_hit", { p_key: hash(key), p_limit: rule.limit, p_window_secs: rule.windowSecs });
    if (error) {
      console.warn("auth throttle unavailable, allowing attempt", error.message);
      return true;
    }
    return data !== false;
  } catch {
    return true;
  }
}

/** Returns true when this sign-in attempt may proceed. */
export async function allowLogin(email: string): Promise<boolean> {
  const [ipOk, emailOk] = await Promise.all([
    hit(`login-ip:${clientIp()}`, RULES.loginIp),
    hit(`login-email:${email.trim().toLowerCase()}`, RULES.loginEmail),
  ]);
  return ipOk && emailOk;
}

/** Returns true when this sign-up attempt may proceed. */
export async function allowSignup(): Promise<boolean> {
  return hit(`signup-ip:${clientIp()}`, RULES.signupIp);
}
