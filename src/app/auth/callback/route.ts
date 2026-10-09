import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/app/login/safe-next";

/**
 * Supabase auth callback.
 *
 * Handles the redirect back from an email-confirmation / magic link / OAuth
 * provider. Supabase appends either a `code` (PKCE) that we exchange for a
 * session, or a `token_hash` + `type` for OTP verification. Once the session
 * is set, we ensure the user has a profile row, then send them on.
 *
 * `next` is the return-after-login path. It is only honoured when it is a
 * same-site relative path (see safeNext) to prevent open redirects.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const rawNext = url.searchParams.get("next");
  const next = safeNext(rawNext, "/app");

  const supabase = createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
      token_hash: tokenHash,
    });
    ok = !error;
  }

  if (!ok) {
    const failure = new URL("/login", url.origin);
    failure.searchParams.set("error", "Sign-in link expired or invalid. Please try again.");
    if (rawNext && safeNext(rawNext, "") !== "") failure.searchParams.set("next", next);
    return NextResponse.redirect(failure);
  }

  // Ensure a profile exists for this user (self-heal if signup didn't create one).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from("profiles").insert({
        auth_user_id: user.id,
        full_name: (user.user_metadata?.full_name as string) || null,
        role: "member",
      });
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
