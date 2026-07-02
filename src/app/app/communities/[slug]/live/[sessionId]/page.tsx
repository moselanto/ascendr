import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { setSessionStatus } from "../../../live-actions";
import LiveQA from "./LiveQA";
import LiveInteractions from "./LiveInteractions";
import LiveStage from "./LiveStage";
import PollPanel, { type LivePoll } from "./PollPanel";

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H"
  );
}

export const dynamic = "force-dynamic";

function fmt(dt: string | null) {
  if (!dt) return "TBD";
  return new Date(dt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function LiveSessionRoom({
  params,
}: {
  params: { slug: string; sessionId: string };
}) {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!community) notFound();

  const { data: membership } = await supabase
    .from("community_members")
    .select("role, status")
    .eq("community_id", community.id)
    .eq("user_id", profile!.id)
    .maybeSingle();
  const isMember = membership?.status === "active";
  const isMod = membership?.role === "owner" || membership?.role === "moderator";

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, community_id, title, scheduled_at, status, host_id, recording_url")
    .eq("id", params.sessionId)
    .maybeSingle();
  // Verify the session actually belongs to this community (prevents loading a
  // session from another community by guessing its ID).
  if (!session || session.community_id !== community.id) notFound();

  if (!isMember) {
    return (
      <div className="max-w-3xl mx-auto rounded-md border border-border bg-card p-10 text-center text-text-secondary">
        Join {community.name} to join this session.
        <div className="mt-4">
          <Link href={`/app/communities/${community.slug}`} className="text-primary font-semibold">
            ← Back to community
          </Link>
        </div>
      </div>
    );
  }

  const canModerate = isMod || session.host_id === profile!.id;

  // Initial questions (most-voted first, then newest). Realtime keeps it fresh.
  const { data: questionRows } = await supabase
    .from("live_questions")
    .select("id, body, votes, status, anonymous, author_id, created_at, profiles:author_id(full_name)")
    .eq("session_id", session.id)
    .order("votes", { ascending: false })
    .order("created_at", { ascending: true });

  // Which questions the current user has voted on.
  const ids = (questionRows ?? []).map((q) => q.id);
  const votedSet: string[] = [];
  if (ids.length) {
    const { data: myVotes } = await supabase
      .from("question_votes")
      .select("question_id")
      .eq("user_id", profile!.id)
      .in("question_id", ids);
    (myVotes ?? []).forEach((v) => votedSet.push(v.question_id));
  }

  // Polls for this session + the current user's votes.
  const { data: pollRows } = await supabase
    .from("live_polls")
    .select("id, session_id, question, options, status, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false });
  const polls = (pollRows as LivePoll[]) ?? [];

  let pollVotes: { poll_id: string; user_id: string; option_index: number }[] = [];
  if (polls.length) {
    const { data: voteRows } = await supabase
      .from("live_poll_votes")
      .select("poll_id, user_id, option_index")
      .in(
        "poll_id",
        polls.map((p) => p.id)
      );
    pollVotes = voteRows ?? [];
  }

  const statusBadge =
    session.status === "live"
      ? "bg-danger/10 text-danger"
      : session.status === "scheduled"
      ? "bg-[#eef2ff] text-primary"
      : "bg-bg text-text-secondary";

  const isHost = session.host_id === profile!.id;
  const hostName = session.title ? "Host" : "Host";
  const hostDisplay = profileHostName(session, profile!, isHost);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Link
          href={`/app/communities/${community.slug}/live`}
          className="text-small text-primary font-semibold"
        >
          ← All sessions
        </Link>
        <span className="text-caption text-text-secondary">
          {community.name} · {fmt(session.scheduled_at)}
        </span>
        {isMod && (
          <div className="ml-auto flex gap-2">
            {session.status !== "live" && (
              <StatusButton sessionId={session.id} communityId={community.id} slug={community.slug} status="live" label="Set live" />
            )}
            {session.status === "live" && (
              <StatusButton sessionId={session.id} communityId={community.id} slug={community.slug} status="ended" label="End session" />
            )}
          </div>
        )}
      </div>

      <h1 className="mb-4 text-h3 font-bold">{session.title}</h1>

      {/* Two-column live layout: stage + controls (left), Q&A/Chat rail (right) */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <LiveStage
            hostName={hostDisplay}
            hostInitials={initialsOf(hostDisplay)}
            isHost={isHost}
            isLive={session.status === "live"}
            watching={0}
          />

          {/* Interaction controls row (matches the screenshot: Raise hand · React · Poll) */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
            <LiveInteractions
              sessionId={session.id}
              meId={profile!.id}
              meName={profile!.full_name || "Member"}
            />
          </div>

          <p className="rounded-lg border border-dashed border-border bg-card px-4 py-3 text-caption text-text-secondary">
            Q&amp;A is the heartbeat: members submit and upvote questions; the host answers the
            top-voted without being interrupted. Sessions can record and the AI posts a summary +
            action items afterward.
          </p>

          {/* Polls under the stage */}
          <div className="rounded-lg border border-border bg-card p-4">
            <PollPanel
              sessionId={session.id}
              slug={community.slug}
              meId={profile!.id}
              canModerate={canModerate}
              initialPolls={polls}
              initialVotes={pollVotes}
            />
          </div>
        </div>

        {/* Right rail: Q&A / Chat / Participants */}
        <div className="rounded-lg border border-border bg-card p-4">
          <LiveQA
            sessionId={session.id}
            communityId={community.id}
            slug={community.slug}
            meId={profile!.id}
            isMod={isMod}
            initialQuestions={(questionRows ?? []).map((q) => ({
              id: q.id,
              body: q.body,
              votes: q.votes ?? 0,
              status: q.status,
              anonymous: q.anonymous,
              author_id: q.author_id,
              // @ts-expect-error supabase join shape
              author_name: q.profiles?.full_name ?? "Member",
              voted: votedSet.includes(q.id),
            }))}
          />
        </div>
      </div>
    </div>
  );
}

/** Resolve a display name for the host (falls back to "Host"). */
function profileHostName(
  session: { host_id: string | null },
  profile: { id: string; full_name: string | null },
  isHost: boolean
) {
  if (isHost) return profile.full_name || "You";
  return "Host";
}

function StatusButton({
  sessionId,
  communityId,
  slug,
  status,
  label,
}: {
  sessionId: string;
  communityId: string;
  slug: string;
  status: string;
  label: string;
}) {
  return (
    <form action={setSessionStatus}>
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="community_id" value={communityId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="status" value={status} />
      <button className="rounded-sm border border-primary px-4 py-2 text-small font-semibold text-primary hover:bg-[#eef2ff]">
        {label}
      </button>
    </form>
  );
}
