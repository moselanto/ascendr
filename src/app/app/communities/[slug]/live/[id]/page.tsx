import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import QaPanel, { type LiveQuestion } from "./QaPanel";

export const dynamic = "force-dynamic";

function initials(name: string | null | undefined) {
  return (
    (name || "Host")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H"
  );
}

export default async function LiveRoomPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: session } = await supabase
    .from("live_sessions")
    .select(
      "id, title, status, recording_url, host_id, community_id, profiles:host_id(full_name), communities:community_id(name, slug)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!session) notFound();

  const host = (Array.isArray(session.profiles) ? session.profiles[0] : session.profiles) as
    | { full_name: string | null }
    | null
    | undefined;
  const community = (Array.isArray(session.communities)
    ? session.communities[0]
    : session.communities) as { name: string; slug: string } | null | undefined;

  const { data: questionRows } = await supabase
    .from("live_questions")
    .select("id, body, votes, status, anonymous, created_at")
    .eq("session_id", params.id)
    .order("votes", { ascending: false });

  const questions = (questionRows as LiveQuestion[]) ?? [];

  // The current user's existing upvotes among these questions, so the button
  // renders in its correct pressed/unpressed state on first paint.
  let initialVotedIds: string[] = [];
  if (profile && questions.length) {
    const { data: myVotes } = await supabase
      .from("question_votes")
      .select("question_id")
      .eq("user_id", profile.id)
      .in(
        "question_id",
        questions.map((q) => q.id)
      );
    initialVotedIds = (myVotes ?? []).map((v) => v.question_id);
  }

  const isLive = session.status === "live";
  const hostName = host?.full_name || "Host";
  const communitySlug = community?.slug ?? params.slug;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-caption text-text-secondary">
        <Link href="/app/live" className="hover:text-text">
          Live
        </Link>
        <span>/</span>
        <Link href={`/app/communities/${communitySlug}`} className="hover:text-text">
          {community?.name ?? "Community"}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Stage + controls */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {/* Video stage */}
            <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#1e293b,#0f172a)] text-white">
              <div className="text-center">
                <div className="mx-auto mb-2.5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[22px] font-bold">
                  {initials(hostName)}
                </div>
                <div className="font-bold">{hostName}</div>
                <div className="text-small opacity-70">Host · presenting</div>
              </div>
              {isLive && (
                <span className="absolute left-3 top-3 rounded-full bg-danger px-2.5 py-1 text-caption font-semibold text-white">
                  ● LIVE
                </span>
              )}
              <span className="absolute right-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-caption font-semibold text-white">
                ⦿ REC
              </span>
              <span className="absolute bottom-3 left-3 rounded-full bg-white/15 px-2.5 py-1 text-caption font-semibold text-white">
                👁 214 watching
              </span>
            </div>
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 px-3.5 py-3">
              <button className="rounded-sm border border-border bg-card px-4 py-2.5 text-small font-semibold">
                ✋ Raise hand
              </button>
              <button className="rounded-sm border border-border bg-card px-4 py-2.5 text-small font-semibold">
                👍 React
              </button>
              <button className="rounded-sm border border-border bg-card px-4 py-2.5 text-small font-semibold">
                📊 Poll
              </button>
              <span className="ml-auto text-caption text-text-secondary">
                Ask below to add to the Q&amp;A board
              </span>
            </div>
          </div>

          <div className="rounded-sm border border-dashed border-border bg-card px-3 py-2.5 text-caption text-text-secondary">
            Q&amp;A is the heartbeat: members submit and upvote questions; the host answers the
            top-voted without being interrupted. Session auto-records and the AI posts a summary +
            action items afterward.
          </div>
        </div>

        {/* Side rail — realtime Q&A */}
        <div className="flex flex-col rounded-lg border border-border bg-card p-3.5">
          <QaPanel sessionId={params.id} slug={communitySlug} initialQuestions={questions} />
        </div>
      </div>
    </div>
  );
}
