"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

/** Mark all of the current user's notifications as read. */
export async function markNotificationsRead() {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);
}
