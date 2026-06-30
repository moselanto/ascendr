"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { awardXp } from "@/lib/xp";

/** Schedule a live session (owner/mod only). Awards +20 XP to the host. */
export async function scheduleSession(formData: FormData) {
  const communityId = String(formData.get("community_id"));
  const slug = String(formData.get("slug"));
  const title = String(formData.get("title") || "").trim();
  const scheduledAt = String(formData.get("scheduled_at") || "").trim();
  if (!title || !scheduledAt) redirect(`/app/communities/${slug}/live?error=Title and time are required`);

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "moderator"].includes(membership.role)) {
    redirect(`/app/communities/${slug}/live?error=Only mentors can schedule sessions`);
  }

  const { data: created, error } = await supabase
    .from("live_sessions")
    .insert({
      community_id: communityId,
      host_id: profile.id,
      title,
      scheduled_at: new Date(scheduledAt).toISOString(),
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) {
    redirect(`/app/communities/${slug}/live?error=${encodeURIComponent(error.message)}`);
  }

  await awardXp(profile.id, "live_schedule", 20, communityId);
  revalidatePath(`/app/communities/${slug}/live`);
  redirect(`/app/communities/${slug}/live/${created!.id}`);
}

/** Update a session's status (owner/mod): scheduled -> live -> ended. */
export async function setSessionStatus(formData: FormData) {
  const sessionId = String(formData.get("session_id"));
  const communityId = String(formData.get("community_id"));
  const slug = String(formData.get("slug"));
  const status = String(formData.get("status"));
  if (!["scheduled", "live", "ended"].includes(status)) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "moderator"].includes(membership.role)) return;

  const patch: Record<string, unknown> = { status };
  if (status === "live") patch.started_at = new Date().toISOString();
  if (status === "ended") patch.ended_at = new Date().toISOString();
  await supabase.from("live_sessions").update(patch).eq("id", sessionId);

  revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
  redirect(`/app/communities/${slug}/live/${sessionId}`);
}

/** Ask a question in a session (members). Awards +5 XP. */
export async function askQuestion(formData: FormData) {
  const sessionId = String(formData.get("session_id"));
  const communityId = String(formData.get("community_id"));
  const slug = String(formData.get("slug"));
  const body = String(formData.get("body") || "").trim();
  const anonymous = formData.get("anonymous") === "on";
  if (!body) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  await supabase.from("live_questions").insert({
    session_id: sessionId,
    author_id: profile.id,
    body,
    anonymous,
    status: "open",
  });

  await awardXp(profile.id, "live_question", 5, communityId);
  revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
}

/** Toggle an upvote on a question (one per user; trigger keeps the count in sync). */
export async function toggleQuestionVote(
  questionId: string,
  sessionId: string,
  slug: string
) {
  const profile = await getCurrentProfile();
  if (!profile) return;

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
  } else {
    await supabase.from("question_votes").insert({ question_id: questionId, user_id: profile.id });
  }
  revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
}

/** Mark a question answered or pinned (owner/mod). */
export async function setQuestionStatus(formData: FormData) {
  const questionId = String(formData.get("question_id"));
  const sessionId = String(formData.get("session_id"));
  const communityId = String(formData.get("community_id"));
  const slug = String(formData.get("slug"));
  const status = String(formData.get("status"));
  if (!["open", "answered", "pinned"].includes(status)) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "moderator"].includes(membership.role)) return;

  await supabase.from("live_questions").update({ status }).eq("id", questionId);
  revalidatePath(`/app/communities/${slug}/live/${sessionId}`);
}
