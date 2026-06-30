import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Returns the current user's profile row, or null if not signed in / no profile. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Self-heal: if the user exists but has no profile yet, create one.
  if (!data) {
    const { data: created } = await supabase
      .from("profiles")
      .insert({ auth_user_id: user.id, role: "member" })
      .select("*")
      .single();
    return (created as Profile) ?? null;
  }
  return data as Profile;
}
