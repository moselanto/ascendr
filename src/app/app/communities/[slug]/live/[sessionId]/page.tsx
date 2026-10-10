import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { setSessionStatus } from "../../../live-actions";
import LiveRail from "./LiveRail";
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

export default async function LiveSessionRoom(
  props: {
    params: Promise<{ slug: string; sessionId: string }>;
  }
) {
  const params = await props.params;
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
      <div className="max-w-3xl mx-auto rounded-xl border border-border bg-white p-10 text-center text-text-secondary">
        Join {community.name} to join this session.
        <div className="mt-4">
          <Link href={`/app/communities/${community.slug}`} className="text-brand-600 font-semibold">
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

  // Initial side-chat messages for the Chat tab (realtime keeps it fresh).
  const { data: chatRows } = await supabase
    .from("live_chat_messages")
    .select("id, body, author_id, created_at, profiles:author_id(full_name)")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(200);

  const isHost = session.host_id === profile!.id;
  const hostDisplay = isHost ? profile!.full_name || "You" : "Host";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Link
          href={`/app/communities/${community.slug}/live`}
          className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[13px] font-medium text-ink hover:border-ink/30"
        >
          ← All sessions
        </Link>
        <span className="text-[12px] text-text-secondary">
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

      <div className="mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">
          {session.status === "live" ? "Live now" : session.status === "ended" ? "Session ended" : "Live session"}
        </p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-ink md:text-[30px]">{session.title}</h1>
      </div>

      {/* Two-column live layout: stage + controls (left), Q&A/Chat rail (right) */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <LiveStage
            hostName={hostDisplay}
            hostInitials={initialsOf(hostDisplay)}
            isHost={isHost}
            isLive={session.status === "live"}
            watching={0}
          />

          {/* Interaction controls row (matches the screenshot: Raise hand · React · Poll) */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white p-3 shadow-card">
            <LiveInteractions
              sessionId={session.id}
              meId={profile!.id}
              meName={profile!.full_name || "Member"}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { t: "Ask and upvote", d: "Questions with the most votes rise to the top for the host." },
              { t: "Raise your hand", d: "The host sees who wants to speak, without interruptions." },
              { t: "Summary after", d: "Recorded sessions get an AI summary and action items." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-border bg-white px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">{x.t}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-text-secondary">{x.d}</p>
              </div>
            ))}
          </div>

          {/* Polls under the stage */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
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
        <div className="rounded-2xl border border-border bg-white p-4 shadow-card lg:sticky lg:top-20 lg:self-start">
          <LiveRail
            sessionId={session.id}
            communityId={community.id}
            slug={community.slug}
            meId={profile!.id}
            isMod={isMod}
            isHost={isHost}
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
            initialChat={(chatRows ?? []).map((m) => ({
              id: m.id,
              body: m.body,
              author_id: m.author_id,
              created_at: m.created_at,
              // @ts-expect-error supabase join shape
              author_name: m.profiles?.full_name ?? "Member",
            }))}
          />
        </div>
      </div>
    </div>
  );
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
      <button className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-700">
        {label}
      </button>
    </form>
  );
}
