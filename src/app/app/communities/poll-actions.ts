"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

/** Confirm the caller is owner/moderator of the community (or the session host). */
async function canModerateSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  profileId: string
): Promise<boolean> {
  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id, community_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return false;
  if (session.host_id === profileId) return true;
  if (!session.community_id) return false;

  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", session.community_id)
    .eq("user_id", profileId)
    .maybeSingle();
  return membership?.role === "owner" || membership?.role === "moderator";
}

/** Host/mod: create a poll in a session. Options arrive as option_0..option_5. */
export async function createLivePoll(formData: FormData) {
  const sessionId = String(formData.get("session_id") || "");
  const slug = String(formData.get("slug") || "");
  const question = String(formData.get("question") || "").trim();
  if (!sessionId || !question) return;

  const options: string[] = [];
  for (let i = 0; i < 6; i++) {
    const opt = String(formData.get(`option_${i}`) || "").trim();
    if (opt) options.push(opt);
  }
  if (options.length < 2) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  if (!(await canModerateSession(supabase, sessionId, profile.id))) return;

  await supabase.from("live_polls").insert({
    session_id: sessionId,
    created_by: profile.id,
    question,
    options,
    status: "open",
  });

  if (slug) revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
}

/** Cast or change the current user's vote on an open poll (one vote per user). */
export async function voteLivePoll(pollId: string, optionIndex: number) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!pollId || optionIndex < 0) return;

  const supabase = createClient();
  await supabase
    .from("live_poll_votes")
    .upsert(
      { poll_id: pollId, user_id: profile.id, option_index: optionIndex },
      { onConflict: "poll_id,user_id" }
    );
}

/** Host/mod: close a poll so no further votes are accepted. */
export async function closeLivePoll(pollId: string, sessionId: string, slug: string) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!pollId) return;

  const supabase = createClient();
  if (!(await canModerateSession(supabase, sessionId, profile.id))) return;

  await supabase.from("live_polls").update({ status: "closed" }).eq("id", pollId);
  if (slug) revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
}
