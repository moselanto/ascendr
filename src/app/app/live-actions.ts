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

const VALID_STATUS = ["open", "answered", "pinned"] as const;
type QuestionStatus = (typeof VALID_STATUS)[number];

/**
 * Host/mod control: set a question's status (open / answered / pinned).
 * RLS (live_questions_update) only permits community mods to update, so a
 * non-mod call is a safe no-op at the database layer; we also verify server
 * side and pin at most one question at a time. The status change streams to
 * all viewers via the existing realtime UPDATE subscription. Returns the new
 * status so the client can reconcile.
 */
export async function setQuestionStatus(
  questionId: string,
  status: string
): Promise<{ status: QuestionStatus | null }> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!questionId || !(VALID_STATUS as readonly string[]).includes(status)) {
    return { status: null };
  }
  const next = status as QuestionStatus;

  const supabase = createClient();

  // Resolve the question's session + community, and confirm the caller is a
  // moderator/owner of that community before attempting the write.
  const { data: q } = await supabase
    .from("live_questions")
    .select("id, session_id, live_sessions:session_id(community_id)")
    .eq("id", questionId)
    .maybeSingle();
  if (!q) return { status: null };

  const sessionRel = (Array.isArray(q.live_sessions) ? q.live_sessions[0] : q.live_sessions) as
    | { community_id: string }
    | null
    | undefined;
  const communityId = sessionRel?.community_id;
  if (!communityId) return { status: null };

  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", profile.id)
    .maybeSingle();
  const canModerate = membership?.role === "owner" || membership?.role === "moderator";
  if (!canModerate) return { status: null };

  // Only one pinned question per session: unpin any others first.
  if (next === "pinned") {
    await supabase
      .from("live_questions")
      .update({ status: "open" })
      .eq("session_id", q.session_id)
      .eq("status", "pinned")
      .neq("id", questionId);
  }

  const { error } = await supabase
    .from("live_questions")
    .update({ status: next })
    .eq("id", questionId);
  if (error) return { status: null };

  return { status: next };
}

/** Confirm the caller is owner/moderator of the session's community, or its host. */
async function canModerateSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  profileId: string
): Promise<{ ok: boolean; communityId: string | null }> {
  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id, community_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, communityId: null };
  if (session.host_id === profileId) return { ok: true, communityId: session.community_id };
  if (!session.community_id) return { ok: false, communityId: null };

  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", session.community_id)
    .eq("user_id", profileId)
    .maybeSingle();
  const ok = membership?.role === "owner" || membership?.role === "moderator";
  return { ok, communityId: session.community_id };
}

/**
 * Host/mod control: create a poll in a live session. Options come in as
 * option_0, option_1, … form fields. Streams to viewers via realtime.
 */
export async function createLivePoll(formData: FormData) {
  const sessionId = String(formData.get("session_id") || "");
  const question = String(formData.get("question") || "").trim();
  if (!sessionId || !question) return;

  const options: string[] = [];
  for (let i = 0; i < 6; i++) {
    const opt = String(formData.get(`option_${i}`) || "").trim();
    if (opt) options.push(opt);
  }
  if (options.length < 2) return; // need at least two choices

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { ok } = await canModerateSession(supabase, sessionId, profile.id);
  if (!ok) return;

  await supabase.from("live_polls").insert({
    session_id: sessionId,
    created_by: profile.id,
    question,
    options,
    status: "open",
  });
}

/** Cast (or change) the current user's vote on an open poll. */
export async function voteLivePoll(
  pollId: string,
  optionIndex: number
): Promise<{ voted: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!pollId || optionIndex < 0) return { voted: false };

  const supabase = createClient();
  // Upsert the user's single vote for this poll (PK is poll_id + user_id).
  await supabase
    .from("live_poll_votes")
    .upsert(
      { poll_id: pollId, user_id: profile.id, option_index: optionIndex },
      { onConflict: "poll_id,user_id" }
    );
  return { voted: true };
}

/** Host/mod control: close a poll so no further votes are accepted. */
export async function closeLivePoll(pollId: string) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!pollId) return;

  const supabase = createClient();
  const { data: poll } = await supabase
    .from("live_polls")
    .select("session_id")
    .eq("id", pollId)
    .maybeSingle();
  if (!poll) return;

  const { ok } = await canModerateSession(supabase, poll.session_id, profile.id);
  if (!ok) return;

  await supabase.from("live_polls").update({ status: "closed" }).eq("id", pollId);
}
