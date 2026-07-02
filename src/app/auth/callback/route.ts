import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase auth callback.
 *
 * Handles the redirect back from an email-confirmation / magic link. Supabase
 * appends either a `code` (PKCE) that we exchange for a session, or a
 * `token_hash` + `type` for OTP verification. Once the session is set, we
 * ensure the user has a profile row, then send them into the app.
 *
 * Without this route, confirmation links land on a non-existent path and the
 * user sees a 404 ("account not connected").
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/app";

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
    return NextResponse.redirect(
      new URL("/login?error=Sign-in link expired or invalid. Please try again.", url.origin)
    );
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
