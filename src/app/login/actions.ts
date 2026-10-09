"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "./safe-next";

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

  const supabase = createClient();
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

  // If email confirmation is on, send the confirmation link through
  // /auth/callback carrying the return path. When the origin is unknown we
  // leave Supabase's default (site URL) in place, exactly as before.
  const origin = headers().get("origin");
  const emailRedirectTo = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent(next ?? "/onboarding")}`
    : undefined;

  const supabase = createClient();
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
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
