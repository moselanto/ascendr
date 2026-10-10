import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Avatar } from "@/components/ui/Avatar";
import NotificationBell from "./NotificationBell";
import InboxLive from "./InboxLive";
import { AppSidebar, AppCrumb, MobileNav } from "./AppNav";
import Toast from "@/components/ui/Toast";


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
  const { count: dmUnreadCount } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
    .is("read_at", null);
  const messagesUnread = (dmUnreadCount ?? 0) > 0;


  const isAdmin = profile.role === "admin";

  return (
    <div className="min-h-screen bg-surface">
      <AppSidebar isAdmin={isAdmin} communitiesUnread={communitiesUnread} messagesUnread={messagesUnread} streak={streak?.current_len ?? 0} />

      <div className="flex min-h-screen flex-col md:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-white/90 px-5 backdrop-blur md:px-8">
          <Link href="/app" className="text-[15px] font-semibold tracking-[0.08em] text-ink md:hidden">
            ASCENDR
          </Link>
          <AppCrumb isAdmin={isAdmin} />
          <div className="ml-auto flex items-center gap-3">
            <form action="/app/search" className="relative hidden lg:block" role="search">
              <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-text-secondary">{"\u2315"}</span>
              <input
                name="q"
                placeholder={"Search people, communities, roles\u2026"}
                aria-label="Search ASCENDR"
                className="w-56 rounded-lg border border-border bg-surface py-2 pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-ink/30 focus:bg-white"
              />
            </form>
            <NotificationBell meId={profile.id} initial={notifs ?? []} />
            <Link href="/app/settings" className="flex items-center gap-2.5" aria-label="Account settings">
              <Avatar name={profile.full_name} url={profile.avatar_url} size={36} />
              <span className="hidden leading-tight xl:block">
                <span className="block text-[13px] font-semibold text-ink">{profile.full_name || "Member"}</span>
                <span className="block text-[11px] text-text-secondary">View profile</span>
              </span>
            </Link>
            <form action={signOut}>
              <button className="text-[12px] text-text-secondary hover:text-ink">Sign out</button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 pb-24 pt-7 md:px-8 md:pb-12">{children}</main>
      </div>

      <MobileNav communitiesUnread={communitiesUnread} messagesUnread={messagesUnread} />
      <InboxLive meId={profile.id} />

      <Suspense fallback={null}>
        <Toast />
      </Suspense>
    </div>
  );
}
