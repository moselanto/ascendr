"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "./safe-next";
import { allowLogin, allowReset, allowSignup, THROTTLE_MESSAGE } from "@/lib/auth-throttle";

/** Builds /login?... preserving mode and the return path on errors. */
function loginUrl(opts: { signup?: boolean; error?: string; next?: string | null }) {
  const params = new URLSearchParams();
  if (opts.signup) params.set("mode", "signup");
  if (opts.error) params.set("error", opts.error);
  if (opts.next) params.set("next", opts.next);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

/** Reads `next` (or the legacy `redirect` field) from the form, sanitised. */
function nextFrom(formData: FormData): string | null {
  const raw = formData.get("next") ?? formData.get("redirect");
  if (raw == null || String(raw).length === 0) return null;
  const value = safeNext(String(raw), "");
  return value.length > 0 ? value : null;
}

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const next = nextFrom(formData);

  if ((await allowLogin(email)) === false) redirect(loginUrl({ error: THROTTLE_MESSAGE, next }));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(loginUrl({ error: error.message, next }));
  }
  redirect(next ?? "/app");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const fullName = String(formData.get("full_name") || "");
  const next = nextFrom(formData);

  if ((await allowSignup()) === false) redirect(loginUrl({ signup: true, error: THROTTLE_MESSAGE, next }));

  // If email confirmation is on, send the confirmation link through
  // /auth/callback carrying the return path. When the origin is unknown we
  // leave Supabase's default (site URL) in place, exactly as before.
  const origin = (await headers()).get("origin");
  const emailRedirectTo = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent(next ?? "/onboarding")}`
    : undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
  });

  if (error) {
    redirect(loginUrl({ signup: true, error: error.message, next }));
  }

  // Bootstrap a profile row for the new user (id <-> auth.users.id).
  if (data.user) {
    await supabase.from("profiles").insert({
      auth_user_id: data.user.id,
      full_name: fullName || null,
      role: "member",
    });
  }

  redirect(next ?? "/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const RESET_SENT = "If an account exists for that email, we've sent a link to reset your password. Check your inbox and spam folder.";

/**
 * Forgot password: email a reset link. The response is the same whether or
 * not the account exists, so this cannot be used to discover members.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  if (email.includes("@") === false) redirect("/login/forgot?error=" + encodeURIComponent("Enter the email you signed up with."));
  if ((await allowReset(email)) === false) redirect("/login/forgot?error=" + encodeURIComponent(THROTTLE_MESSAGE));

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent("/login/reset")}`,
  });
  if (error) console.warn("password reset email failed", error.message);
  redirect("/login/forgot?sent=1&message=" + encodeURIComponent(RESET_SENT));
}

/**
 * Set a new password for the signed-in member. Used by the reset page (after
 * the emailed link signs them in) and by Settings.
 */
export async function updatePassword(formData: FormData) {
  const from = String(formData.get("from") ?? "") === "settings" ? "settings" : "reset";
  const back = (msg: string) =>
    redirect(from === "settings" ? `/app/settings?pwerror=${encodeURIComponent(msg)}#password` : `/login/reset?error=${encodeURIComponent(msg)}`);

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) back("Use at least 8 characters.");
  if (password.length > 72) back("Use 72 characters or fewer.");
  if (password !== confirm) back("The two passwords don't match.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user == null) redirect("/login?error=" + encodeURIComponent("Your reset link has expired. Request a new one."));

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("different")) back("Choose a password you haven't used here before.");
    if (m.includes("aal2") || m.includes("assurance")) back("Enter your two-factor code first, then change your password.");
    if (m.includes("reauth")) back("For security, sign out and use Forgot password to set a new one.");
    back(`Could not update your password: ${error.message}`);
  }
  redirect(from === "settings" ? "/app/settings?toast=" + encodeURIComponent("Password updated") : "/app?toast=" + encodeURIComponent("Password updated. You're signed in"));
}
