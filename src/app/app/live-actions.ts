"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { awardXp } from "@/lib/xp";

/**
 * Submit a question to a live session's Q&A board. Awards +5 XP (Q&A),
 * notifies the session host, and revalidates the live room so the new
 * question is present on the next server render (realtime handles the
 * instant in-page insert for other viewers).
 */
export async function askLiveQuestion(formData: FormData) {
  const sessionId = String(formData.get("session_id") || "");
  const slug = String(formData.get("slug") || "");
  const body = String(formData.get("body") || "").trim();
  const anonymous = String(formData.get("anonymous") || "") === "1";
  if (!sessionId || !body) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();

  // Insert the question. RLS (live_questions_insert) requires the author to be
  // a member of the session's community, which the room already enforces.
  const { error } = await supabase.from("live_questions").insert({
    session_id: sessionId,
    author_id: profile.id,
    body,
    status: "open",
    anonymous,
  });
  if (error) return;

  // Notify the host (unless they asked their own question).
  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (session && session.host_id && session.host_id !== profile.id) {
    await supabase.from("notifications").insert({
      user_id: session.host_id,
      type: "live_question",
      actor_id: profile.id,
      entity_type: "live_session",
      entity_id: sessionId,
      body: `${anonymous ? "Someone" : profile.full_name || "A member"} asked a question in your live session`,
    });
  }

  await awardXp(profile.id, "live_question", 5);

  if (slug) revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
}

/**
 * Toggle the current user's upvote on a question. Inserts a question_votes row
 * (or removes it if already voted); a DB trigger keeps live_questions.votes in
 * sync, and realtime streams the updated count to all viewers. Returns the
 * user's new voted state so the client can update optimistically.
 */
export async function toggleQuestionVote(
  questionId: string
): Promise<{ voted: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!questionId) return { voted: false };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("question_votes")
    .select("question_id")
    .eq("question_id", questionId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("question_votes")
      .delete()
      .eq("question_id", questionId)
      .eq("user_id", profile.id);
    return { voted: false };
  }

  await supabase
    .from("question_votes")
    .insert({ question_id: questionId, user_id: profile.id });
  return { voted: true };
}
