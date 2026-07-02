"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { awardXp } from "@/lib/xp";

/** Post a message to a live session's side chat (members). Small XP nudge. */
export async function sendLiveChat(formData: FormData) {
  const sessionId = String(formData.get("session_id"));
  const communityId = String(formData.get("community_id"));
  const slug = String(formData.get("slug"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  await supabase.from("live_chat_messages").insert({
    session_id: sessionId,
    author_id: profile.id,
    body: body.slice(0, 1000),
  });

  // Light XP for participating in the live chat (capped by the ledger logic).
  await awardXp(profile.id, "live_chat", 1, communityId);
  revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
}

/** Moderators (or the author) can remove a chat message. */
export async function deleteLiveChat(formData: FormData) {
  const messageId = String(formData.get("message_id"));
  const sessionId = String(formData.get("session_id"));
  const slug = String(formData.get("slug"));
  if (!messageId) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  // RLS enforces author-or-mod; this is just the call.
  await supabase.from("live_chat_messages").delete().eq("id", messageId);
  revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
}

/**
 * Heartbeat: mark the current user present in a session (and optionally set the
 * raised-hand flag). Called on join and on an interval from the client. Uses the
 * touch_presence RPC so a single upsert keeps last_seen_at fresh.
 */
export async function touchPresence(sessionId: string, handRaised?: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = createClient();
  await supabase.rpc("touch_presence", {
    p_session_id: sessionId,
    p_hand: handRaised ?? null,
  });
}

/** Explicitly leave a session (removes the presence row). */
export async function leavePresence(sessionId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = createClient();
  await supabase
    .from("session_presence")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", profile.id);
}

/** Toggle the current user's raised hand in a session. */
export async function toggleHand(sessionId: string, raised: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = createClient();
  await supabase.rpc("touch_presence", {
    p_session_id: sessionId,
    p_hand: raised,
  });
}
