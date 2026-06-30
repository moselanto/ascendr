import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { joinCommunity } from "../actions";
import ChannelChat from "./ChannelChat";
import type { ChannelMessage, Community } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CommunityHome({ params }: { params: { slug: string } }) {
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

  const { data: channel } = await supabase
    .from("community_channels")
    .select("id, name")
    .eq("community_id", c.id)
    .eq("kind", "discussion")
    .order("position")
    .limit(1)
    .maybeSingle();

  let messages: (ChannelMessage & { reactions?: { emoji: string; user_id: string }[] })[] = [];
  if (isMember && channel) {
    const { data } = await supabase
      .from("channel_messages")
      .select("*, profiles:author_id(full_name, handle, avatar_url)")
      .eq("channel_id", channel.id)
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
    <div className="max-w-3xl mx-auto">
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

      {/* Discussion channel */}
      <div className="mt-5 rounded-md border border-border bg-card">
        <div className="border-b border-border px-5 py-3 font-semibold"># discussion</div>
        {!isMember || !channel ? (
          <div className="p-10 text-center text-text-secondary">
            Join the community to read and post in the discussion.
          </div>
        ) : (
          <ChannelChat
            channelId={channel.id}
            communityId={c.id}
            slug={c.slug}
            meId={profile!.id}
            initialMessages={messages}
          />
        )}
      </div>

      <div className="mt-4">
        <Link href="/app/communities" className="text-small text-primary font-semibold">
          ← All communities
        </Link>
      </div>
    </div>
  );
}
