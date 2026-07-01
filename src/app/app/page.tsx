import Link from "next/link";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FeedRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles?: { full_name?: string } | null;
};

function initials(name: string | null | undefined) {
  return (
    (name || "Member")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M"
  );
}

function fmtWhen(dt: string | null) {
  if (!dt) return "TBD";
  return new Date(dt).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  // Streak + XP (real).
  const [{ data: streak }, { data: xp }] = await Promise.all([
    supabase.from("streaks").select("current_len, longest_len").eq("user_id", profile!.id).maybeSingle(),
    supabase.from("xp_events").select("points").eq("user_id", profile!.id),
  ]);
  const totalXp = (xp ?? []).reduce((s, e) => s + (e.points ?? 0), 0);
  const level = Math.max(1, Math.floor(totalXp / 1000) + 1);
  const xpIntoLevel = totalXp % 1000;
  const pctToNext = Math.round((xpIntoLevel / 1000) * 100);

  // My active communities.
  const { data: myMemberships } = await supabase
    .from("community_members")
    .select("communities:community_id(id, name, slug, member_count)")
    .eq("user_id", profile!.id)
    .eq("status", "active")
    .limit(6);
  const myCommunities = (myMemberships ?? [])
    // @ts-expect-error supabase join shape
    .map((m) => m.communities)
    .filter(Boolean) as { id: string; name: string; slug: string; member_count: number }[];
  const communityIds = myCommunities.map((c) => c.id);

  // Next live/upcoming session across my communities.
  let nextSession:
    | { id: string; title: string; scheduled_at: string | null; status: string; slug: string }
    | null = null;
  if (communityIds.length) {
    const { data: sess } = await supabase
      .from("live_sessions")
      .select("id, title, scheduled_at, status, community_id, communities:community_id(slug)")
      .in("community_id", communityIds)
      .in("status", ["live", "scheduled"])
      .order("status", { ascending: true }) // 'live' sorts before 'scheduled'
      .order("scheduled_at", { ascending: true })
      .limit(1);
    if (sess && sess[0]) {
      nextSession = {
        id: sess[0].id,
        title: sess[0].title,
        scheduled_at: sess[0].scheduled_at,
        status: sess[0].status,
        // @ts-expect-error supabase join shape
        slug: sess[0].communities?.slug ?? "",
      };
    }
  }

  // Recent feed (global + my communities are covered by RLS read policy).
  const { data: feedRows } = await supabase
    .from("feed_posts")
    .select("id, body, created_at, author_id, profiles:author_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(5);
  const feed = (feedRows as unknown as FeedRow[]) ?? [];

  const firstName = (profile?.full_name || "there").split(" ")[0];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      {/* Greeting + level/XP header */}
      <div className="flex items-center gap-4 rounded-md bg-gradient-to-r from-primary to-secondary p-5 text-white">
        <div className="text-3xl">🔥</div>
        <div className="flex-1">
          <div className="font-extrabold text-h4">Welcome back, {firstName}</div>
          <div className="text-small opacity-90">
            {streak?.current_len ?? 0}-day streak · Level {level}
          </div>
          <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-white" style={{ width: `${pctToNext}%` }} />
          </div>
          <div className="mt-1 text-caption opacity-90">
            {1000 - xpIntoLevel} XP to Level {level + 1}
          </div>
        </div>
        <div className="text-right">
          <div className="text-h3 font-black">{totalXp}</div>
          <div className="text-caption opacity-90">total XP</div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="flex flex-col gap-4">
          {/* Next live session */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-small font-bold uppercase tracking-wide text-text-secondary">
                Next live session
              </div>
              {nextSession && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${
                    nextSession.status === "live"
                      ? "bg-[#fef2f2] text-danger"
                      : "bg-[#eef2ff] text-primary"
                  }`}
                >
                  {nextSession.status === "live" ? "● LIVE now" : fmtWhen(nextSession.scheduled_at)}
                </span>
              )}
            </div>
            {nextSession ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
                  ◉
                </div>
                <div className="font-semibold">{nextSession.title}</div>
                <Link
                  href={`/app/communities/${nextSession.slug}/live/${nextSession.id}`}
                  className="ml-auto rounded-sm bg-accent px-4 py-2 text-small font-semibold text-white"
                >
                  {nextSession.status === "live" ? "Join" : "View"}
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-small text-text-secondary">
                No upcoming sessions.{" "}
                <Link href="/app/live" className="text-primary font-semibold">
                  Browse live
                </Link>
                .
              </p>
            )}
          </div>

          {/* Recent feed */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-small font-bold uppercase tracking-wide text-text-secondary">
                Recent activity
              </div>
              <Link href="/app/feed" className="text-caption font-semibold text-primary">
                Open feed →
              </Link>
            </div>
            {feed.length ? (
              <ul className="mt-2">
                {feed.map((p) => (
                  <li key={p.id} className="flex gap-3 border-b border-border py-3 last:border-0">
                    <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
                      {initials(p.profiles?.full_name)}
                    </div>
                    <div>
                      <div className="text-small">
                        <Link href={`/app/members/${p.author_id}`} className="font-semibold hover:text-primary">
                          {p.profiles?.full_name || "Member"}
                        </Link>{" "}
                        <span className="text-text-secondary">
                          · {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-small line-clamp-2">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-small text-text-secondary">
                Nothing yet.{" "}
                <Link href="/app/feed" className="text-primary font-semibold">
                  Share the first post
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          {/* My communities */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="text-small font-bold uppercase tracking-wide text-text-secondary">
              My communities
            </div>
            {myCommunities.length ? (
              <div className="mt-3 flex flex-col gap-2">
                {myCommunities.map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/communities/${c.slug}`}
                    className="flex items-center gap-2 text-small hover:text-primary"
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white text-caption font-bold">
                      {initials(c.name)}
                    </span>
                    <span className="font-semibold truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-small text-text-secondary">
                <Link href="/app/communities" className="text-primary font-semibold">
                  Join a community
                </Link>{" "}
                to get started.
              </p>
            )}
          </div>

          {/* AI coach quick link */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="text-small font-bold uppercase tracking-wide text-text-secondary">
              AI Career Coach
            </div>
            <p className="mt-2 text-small text-text-secondary">
              Get a grounded next step toward your goal.
            </p>
            <Link
              href="/app/ai"
              className="mt-3 block rounded-sm border border-border bg-white px-4 py-2 text-center text-small font-semibold hover:border-primary"
            >
              ✦ Ask your coach
            </Link>
          </div>

          {/* Quick links */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="text-small font-bold uppercase tracking-wide text-text-secondary">
              Explore
            </div>
            <div className="mt-2 flex flex-col gap-1.5 text-small font-semibold">
              <Link href="/app/members" className="hover:text-primary">⚇ Member directory</Link>
              <Link href="/app/live" className="hover:text-primary">◉ Live sessions</Link>
              <Link href="/app/communities/new" className="hover:text-primary">＋ Create a community</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
