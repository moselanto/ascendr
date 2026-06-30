import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { joinCommunity, createChannel } from "../actions";
import ChannelChat from "./ChannelChat";
import type { ChannelMessage, Community } from "@/lib/types";

export const dynamic = "force-dynamic";

type Channel = { id: string; name: string; kind: string; position: number };

export default async function CommunityHome({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { channel?: string };
}) {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!community) notFound();
  const c = community as Community;

  const { data: membership } = await supabase
    .from("community_members")
    .select("role, status")
    .eq("community_id", c.id)
    .eq("user_id", profile!.id)
    .maybeSingle();
  const isMember = membership?.status === "active";
  const isMod = membership?.role === "owner" || membership?.role === "moderator";

  // Load ALL channels for this community.
  const { data: channelRows } = await supabase
    .from("community_channels")
    .select("id, name, kind, position")
    .eq("community_id", c.id)
    .order("position", { ascending: true });
  const channels = (channelRows as Channel[]) ?? [];

  // Active channel: ?channel=<id> if valid, else the first one.
  const active =
    channels.find((ch) => ch.id === searchParams.channel) ?? channels[0] ?? null;

  // Unread dots per channel (only meaningful for members).
  const unreadChannels = new Set<string>();
  if (isMember && channels.length) {
    const channelIds = channels.map((ch) => ch.id);
    const { data: reads } = await supabase
      .from("channel_reads")
      .select("channel_id, last_read_at")
      .eq("user_id", profile!.id)
      .in("channel_id", channelIds);
    const lastReadBy = new Map<string, string>();
    (reads ?? []).forEach((r) => lastReadBy.set(r.channel_id, r.last_read_at));

    const { data: recent } = await supabase
      .from("channel_messages")
      .select("channel_id, created_at")
      .in("channel_id", channelIds)
      .neq("author_id", profile!.id)
      .order("created_at", { ascending: false });
    const latestBy = new Map<string, string>();
    (recent ?? []).forEach((m) => {
      if (!latestBy.has(m.channel_id)) latestBy.set(m.channel_id, m.created_at);
    });
    channelIds.forEach((id) => {
      const latest = latestBy.get(id);
      if (!latest) return;
      const read = lastReadBy.get(id);
      if (!read || new Date(latest) > new Date(read)) unreadChannels.add(id);
    });
  }

  // Messages + reactions for the active channel.
  let messages: (ChannelMessage & { reactions?: { emoji: string; user_id: string }[] })[] = [];
  if (isMember && active) {
    const { data } = await supabase
      .from("channel_messages")
      .select("*, profiles:author_id(full_name, handle, avatar_url)")
      .eq("channel_id", active.id)
      .order("created_at", { ascending: true })
      .limit(100);
    const base = (data as ChannelMessage[]) ?? [];
    const ids = base.map((m) => m.id);
    let reactions: { message_id: string; emoji: string; user_id: string }[] = [];
    if (ids.length) {
      const { data: rx } = await supabase
        .from("message_reactions")
        .select("message_id, emoji, user_id")
        .in("message_id", ids);
      reactions = rx ?? [];
    }
    messages = base.map((m) => ({
      ...m,
      reactions: reactions.filter((r) => r.message_id === m.id).map((r) => ({ emoji: r.emoji, user_id: r.user_id })),
    }));
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-primary to-accent" />
        <div className="p-5 flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-h3 font-bold">{c.name}</h1>
            <p className="text-small text-text-secondary">{c.member_count} members</p>
          </div>
          {!isMember ? (
            <form action={joinCommunity} className="ml-auto">
              <input type="hidden" name="community_id" value={c.id} />
              <input type="hidden" name="slug" value={c.slug} />
              <button className="rounded-sm bg-primary px-5 py-2.5 text-small font-semibold text-white">
                Join community (+15 XP)
              </button>
            </form>
          ) : (
            <span className="ml-auto rounded-full bg-[#ecfdf5] px-3 py-1 text-caption font-semibold text-[#047857]">
              ✓ Member
            </span>
          )}
        </div>
        {c.description && <p className="px-5 pb-5 text-body text-text-secondary">{c.description}</p>}
      </div>

      {!isMember || !active ? (
        <div className="mt-5 rounded-md border border-border bg-card p-10 text-center text-text-secondary">
          Join the community to read and post in its channels.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-[200px_1fr]">
          {/* Channel sidebar */}
          <div className="rounded-md border border-border bg-card p-3 h-fit">
            <div className="text-caption font-bold uppercase tracking-wide text-text-secondary px-2 pb-1">
              Channels
            </div>
            <div className="flex flex-col gap-0.5">
              {channels.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/app/communities/${c.slug}?channel=${ch.id}`}
                  className={`flex items-center gap-2 rounded-sm px-2 py-2 text-small font-semibold ${
                    ch.id === active.id ? "bg-[#eef2ff] text-primary" : "text-text-secondary hover:bg-bg"
                  }`}
                >
                  <span># {ch.name}</span>
                  {unreadChannels.has(ch.id) && ch.id !== active.id && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-danger" />
                  )}
                </Link>
              ))}
            </div>

            {isMod && (
              <form action={createChannel} className="mt-3 border-t border-border pt-3">
                <input type="hidden" name="community_id" value={c.id} />
                <input type="hidden" name="slug" value={c.slug} />
                <input
                  name="name"
                  required
                  placeholder="new-channel"
                  className="w-full rounded-sm border border-border px-2 py-1.5 text-caption"
                />
                <button className="mt-2 w-full rounded-sm bg-primary px-2 py-1.5 text-caption font-semibold text-white">
                  + Add channel
                </button>
              </form>
            )}
          </div>

          {/* Active channel chat */}
          <div className="rounded-md border border-border bg-card">
            <div className="border-b border-border px-5 py-3 font-semibold"># {active.name}</div>
            <ChannelChat
              key={active.id}
              channelId={active.id}
              communityId={c.id}
              slug={c.slug}
              channelName={active.name}
              meId={profile!.id}
              meName={profile!.full_name || "Member"}
              initialMessages={messages}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <Link href="/app/communities" className="text-small text-primary font-semibold">
          ← All communities
        </Link>
      </div>
    </div>
  );
}
