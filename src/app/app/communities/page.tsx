import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import type { Community } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: communities } = await supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: myMemberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", profile!.id);
  const joined = new Set((myMemberships ?? []).map((m) => m.community_id));

  // ---- Unread computation ----
  // For each JOINED community: find its discussion channel, the latest message
  // time, and the user's last_read time. Unread if a message arrived after the
  // last read (or never read) and it wasn't authored only by the user.
  const unread = new Set<string>();
  const list = (communities as Community[] | null) ?? [];
  const joinedList = list.filter((c) => joined.has(c.id));

  if (joinedList.length) {
    const ids = joinedList.map((c) => c.id);

    const { data: channels } = await supabase
      .from("community_channels")
      .select("id, community_id")
      .in("community_id", ids)
      .eq("kind", "discussion");
    const channelByCommunity = new Map<string, string>();
    const channelIds: string[] = [];
    (channels ?? []).forEach((ch) => {
      if (!channelByCommunity.has(ch.community_id)) {
        channelByCommunity.set(ch.community_id, ch.id);
        channelIds.push(ch.id);
      }
    });

    if (channelIds.length) {
      const { data: reads } = await supabase
        .from("channel_reads")
        .select("channel_id, last_read_at")
        .eq("user_id", profile!.id)
        .in("channel_id", channelIds);
      const lastReadByChannel = new Map<string, string>();
      (reads ?? []).forEach((r) => lastReadByChannel.set(r.channel_id, r.last_read_at));

      // Latest message per channel, not authored by me.
      const { data: recent } = await supabase
        .from("channel_messages")
        .select("channel_id, author_id, created_at")
        .in("channel_id", channelIds)
        .neq("author_id", profile!.id)
        .order("created_at", { ascending: false });

      const latestByChannel = new Map<string, string>();
      (recent ?? []).forEach((m) => {
        if (!latestByChannel.has(m.channel_id)) latestByChannel.set(m.channel_id, m.created_at);
      });

      channelByCommunity.forEach((channelId, communityId) => {
        const latest = latestByChannel.get(channelId);
        if (!latest) return;
        const lastRead = lastReadByChannel.get(channelId);
        if (!lastRead || new Date(latest) > new Date(lastRead)) {
          unread.add(communityId);
        }
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-h3 font-bold">Communities</h1>
        <Link href="/app/communities/new" className="rounded-sm bg-primary px-4 py-2.5 text-small font-semibold text-white">
          + Create community
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {list.length ? (
          list.map((c) => (
            <Link
              key={c.id}
              href={`/app/communities/${c.slug}`}
              className="relative rounded-md border border-border bg-card p-5 hover:shadow-sm transition"
            >
              {unread.has(c.id) && (
                <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                  ● New
                </span>
              )}
              <div className="h-20 -mx-5 -mt-5 mb-4 rounded-t-md bg-gradient-to-br from-primary to-accent" />
              <div className="font-bold text-h4">{c.name}</div>
              <p className="text-small text-text-secondary mt-1 line-clamp-2">
                {c.description || "A community on ASCENDR."}
              </p>
              <div className="mt-3 flex items-center justify-between text-caption text-text-secondary">
                <span>{c.member_count} members</span>
                {joined.has(c.id) ? (
                  <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 font-semibold text-[#047857]">Joined</span>
                ) : (
                  <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 font-semibold text-primary">Open</span>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="sm:col-span-2 rounded-md border border-dashed border-border bg-card p-10 text-center text-text-secondary">
            No communities yet.{" "}
            <Link href="/app/communities/new" className="text-primary font-semibold">Create the first one</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
