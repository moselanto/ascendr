import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { setSessionStatus } from "../../live-actions";
import LiveQA from "./LiveQA";

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

  const statusBadge =
    session.status === "live"
      ? "bg-danger/10 text-danger"
      : session.status === "scheduled"
      ? "bg-[#eef2ff] text-primary"
      : "bg-bg text-text-secondary";

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/app/communities/${community.slug}/live`} className="text-small text-primary font-semibold">
        ← All sessions
      </Link>

      <div className="mt-3 rounded-md border border-border bg-card p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold capitalize ${statusBadge}`}>
            {session.status === "live" ? "● Live now" : session.status}
          </span>
          <span className="text-caption text-text-secondary">{fmt(session.scheduled_at)}</span>
        </div>
        <h1 className="mt-2 text-h3 font-bold">{session.title}</h1>

        {session.recording_url && session.status === "ended" && (
          <a
            href={session.recording_url}
            className="mt-3 inline-block rounded-sm bg-primary px-4 py-2 text-small font-semibold text-white"
          >
            Watch the recording
          </a>
        )}

        {isMod && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {session.status !== "live" && (
              <StatusButton sessionId={session.id} communityId={community.id} slug={community.slug} status="live" label="Go live" />
            )}
            {session.status === "live" && (
              <StatusButton sessionId={session.id} communityId={community.id} slug={community.slug} status="ended" label="End session" />
            )}
          </div>
        )}
      </div>

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
      <button className="rounded-sm border border-primary px-4 py-2 text-small font-semibold text-primary hover:bg-[#eef2ff]">
        {label}
      </button>
    </form>
  );
}
