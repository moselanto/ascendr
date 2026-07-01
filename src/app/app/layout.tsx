import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import NotificationBell from "./NotificationBell";

const NAV = [
  { href: "/app", label: "Home", icon: "◳" },
  { href: "/app/feed", label: "Feed", icon: "▤" },
  { href: "/app/communities", label: "Communities", icon: "◎" },
  { href: "/app/members", label: "Members", icon: "⚇" },
  { href: "/app/ai", label: "AI Coach", icon: "✦" },
  { href: "/app/communities/new", label: "Create", icon: "＋" },
];

/**
 * Returns true if the user has any unread channel activity across the
 * communities they are an active member of. Mirrors the per-channel unread
 * logic on the community page, but rolled up to a single boolean for the nav.
 */
async function hasUnreadAnywhere(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  // Communities the user actively belongs to.
  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", userId)
    .eq("status", "active");
  const communityIds = (memberships ?? []).map((m) => m.community_id);
  if (communityIds.length === 0) return false;

  // All channels in those communities.
  const { data: channelRows } = await supabase
    .from("community_channels")
    .select("id")
    .in("community_id", communityIds);
  const channelIds = (channelRows ?? []).map((ch) => ch.id);
  if (channelIds.length === 0) return false;

  // Last-read timestamps per channel for this user.
  const { data: reads } = await supabase
    .from("channel_reads")
    .select("channel_id, last_read_at")
    .eq("user_id", userId)
    .in("channel_id", channelIds);
  const lastReadBy = new Map<string, string>();
  (reads ?? []).forEach((r) => lastReadBy.set(r.channel_id, r.last_read_at));

  // Most recent message by someone else, per channel.
  const { data: recent } = await supabase
    .from("channel_messages")
    .select("channel_id, created_at")
    .in("channel_id", channelIds)
    .neq("author_id", userId)
    .order("created_at", { ascending: false });
  const latestBy = new Map<string, string>();
  (recent ?? []).forEach((m) => {
    if (!latestBy.has(m.channel_id)) latestBy.set(m.channel_id, m.created_at);
  });

  // Unread if any channel has a newer foreign message than the user's last read.
  for (const channelId of channelIds) {
    const latest = latestBy.get(channelId);
    if (!latest) continue;
    const read = lastReadBy.get(channelId);
    if (!read || new Date(latest) > new Date(read)) return true;
  }
  return false;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { data: streak } = await supabase
    .from("streaks")
    .select("current_len")
    .eq("user_id", profile.id)
    .maybeSingle();

  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, type, body, read_at, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const communitiesUnread = await hasUnreadAnywhere(supabase, profile.id);

  const initials =
    (profile.full_name || "Me")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ME";

  return (
    <div className="grid md:grid-cols-[240px_1fr] min-h-screen">
      <aside className="hidden md:flex flex-col gap-1 border-r border-border bg-card p-4">
        <Link href="/app" className="text-xl font-black px-2 pb-4 pt-1">
          ASCEND<span className="text-primary">R</span>
        </Link>
        {NAV.map((n) => {
          const showDot = n.href === "/app/communities" && communitiesUnread;
          return (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-small font-semibold text-text-secondary hover:bg-bg"
            >
              <span className="w-4 text-center">{n.icon}</span>
              {n.label}
              {showDot && (
                <span
                  className="ml-auto h-2 w-2 rounded-full bg-danger"
                  aria-label="Unread activity"
                />
              )}
            </Link>
          );
        })}
        <div className="mt-auto flex items-center gap-2 rounded-sm bg-[#ecfdf5] px-3 py-2 text-small font-semibold text-[#047857]">
          🔥 {streak?.current_len ?? 0}-day streak
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
          <Link href="/app" className="md:hidden text-lg font-black">
            ASCEND<span className="text-primary">R</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-small text-text-secondary hidden sm:block">
              {profile.full_name || "Member"}
            </span>
            <NotificationBell meId={profile.id} initial={notifs ?? []} />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
              {initials}
            </div>
            <form action={signOut}>
              <button className="text-caption text-text-secondary hover:text-text">Sign out</button>
            </form>
          </div>
        </header>
        <main className="p-5 md:p-6">{children}</main>
        <nav className="md:hidden sticky bottom-0 flex justify-around border-t border-border bg-card py-2">
          {NAV.map((n) => {
            const showDot = n.href === "/app/communities" && communitiesUnread;
            return (
              <Link
                key={n.href}
                href={n.href}
                className="relative flex flex-col items-center gap-0.5 text-caption font-semibold text-text-secondary"
              >
                <span className="text-lg">{n.icon}</span>
                {n.label}
                {showDot && (
                  <span className="absolute -top-0.5 right-2 h-2 w-2 rounded-full bg-danger" aria-label="Unread activity" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
