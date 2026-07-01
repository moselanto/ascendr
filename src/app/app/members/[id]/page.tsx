import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

function initials(name: string | null) {
  return (
    (name || "Member")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M"
  );
}

const BADGES = [
  ["🏅", "Closer"],
  ["🚀", "Fast Start"],
  ["💬", "Conversationalist"],
  ["🎓", "Course Grad"],
];

export default async function MemberProfile({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const me = await getCurrentProfile();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, handle, role, bio, avatar_url, verified_expert, created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!profile) notFound();

  const isMe = me?.id === profile.id;

  // XP total + streak.
  const [{ data: xp }, { data: streak }, { data: memberships }] = await Promise.all([
    supabase.from("xp_events").select("points").eq("user_id", profile.id),
    supabase.from("streaks").select("current_len, longest_len").eq("user_id", profile.id).maybeSingle(),
    supabase
      .from("community_members")
      .select("role, communities:community_id(id, name, slug)")
      .eq("user_id", profile.id)
      .eq("status", "active"),
  ]);
  const totalXp = (xp ?? []).reduce((s, e) => s + (e.points ?? 0), 0);
  const level = Math.max(1, Math.floor(totalXp / 1000) + 1);

  // Recent XP activity (as a lightweight activity feed).
  const { data: recentXp } = await supabase
    .from("xp_events")
    .select("source, points, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const SOURCE_LABEL: Record<string, string> = {
    community_create: "Created a community",
    community_join: "Joined a community",
    channel_message: "Posted in a channel",
    feed_post: "Shared a post",
    feed_comment: "Commented on a post",
    live_schedule: "Scheduled a live session",
    live_question: "Asked in a live Q&A",
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/app/members" className="text-small text-primary font-semibold">
        ← All members
      </Link>

      {/* Header */}
      <div className="mt-3 overflow-hidden rounded-md border border-border bg-card">
        <div className="h-24 bg-gradient-to-br from-primary to-accent" />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <div className="-mt-16 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-primary to-secondary text-xl font-bold text-white">
            {initials(profile.full_name)}
          </div>
          <div>
            <div className="flex items-center gap-2 text-h4 font-bold">
              {profile.full_name || "Member"}
              {profile.verified_expert && <span title="Verified expert" className="text-primary">✔</span>}
            </div>
            <div className="text-small text-text-secondary capitalize">
              {profile.role}
              {profile.handle ? ` · @${profile.handle}` : ""}
            </div>
          </div>
          <div className="ml-auto">
            {isMe ? (
              <span className="rounded-full bg-bg px-3 py-1 text-caption font-semibold text-text-secondary">
                This is you
              </span>
            ) : (
              <button className="rounded-sm bg-primary px-4 py-2 text-small font-semibold text-white">
                + Connect
              </button>
            )}
          </div>
        </div>
        {profile.bio && <p className="px-5 pb-5 text-body text-text-secondary">{profile.bio}</p>}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-card p-4 text-center">
          <div className="text-h4 font-black">Level {level}</div>
          <div className="text-caption text-text-secondary">{totalXp} XP</div>
        </div>
        <div className="rounded-md border border-border bg-card p-4 text-center">
          <div className="text-h4 font-black">🔥 {streak?.current_len ?? 0}</div>
          <div className="text-caption text-text-secondary">day streak</div>
        </div>
        <div className="rounded-md border border-border bg-card p-4 text-center">
          <div className="text-h4 font-black">{memberships?.length ?? 0}</div>
          <div className="text-caption text-text-secondary">communities</div>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-4 rounded-md border border-border bg-card p-4">
        <div className="text-small font-bold uppercase tracking-wide text-text-secondary">Badges</div>
        <div className="mt-3 flex flex-wrap gap-5">
          {BADGES.map((b) => (
            <div key={b[1]} className="text-center">
              <div className="text-3xl">{b[0]}</div>
              <div className="text-caption text-text-secondary">{b[1]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Communities */}
      <div className="mt-4 rounded-md border border-border bg-card p-4">
        <div className="text-small font-bold uppercase tracking-wide text-text-secondary">Communities</div>
        {memberships && memberships.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {memberships.map((m, i) => {
              const raw = (m as unknown as { communities?: unknown }).communities;
              const comm = (Array.isArray(raw) ? raw[0] : raw) as
                | { id: string; name: string; slug: string }
                | null
                | undefined;
              if (!comm) return null;
              return (
                <Link
                  key={i}
                  href={`/app/communities/${comm.slug}`}
                  className="flex items-center gap-2 text-small hover:text-primary"
                >
                  <span className="font-semibold">{comm.name}</span>
                  {m.role !== "member" && (
                    <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-caption font-semibold text-primary capitalize">
                      {m.role}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-small text-text-secondary">Not in any communities yet.</p>
        )}
      </div>

      {/* Activity */}
      <div className="mt-4 rounded-md border border-border bg-card p-4">
        <div className="text-small font-bold uppercase tracking-wide text-text-secondary">Recent activity</div>
        {recentXp && recentXp.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {recentXp.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-small">
                <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-caption font-semibold text-[#047857]">
                  +{e.points} XP
                </span>
                <span>{SOURCE_LABEL[e.source] ?? e.source}</span>
                <span className="ml-auto text-caption text-text-secondary">
                  {new Date(e.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-small text-text-secondary">No activity yet.</p>
        )}
      </div>
    </div>
  );
}
