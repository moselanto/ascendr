import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { joinCommunity, sendMessage } from "../actions";
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

  // The default discussion channel (created with the community).
  const { data: channel } = await supabase
    .from("community_channels")
    .select("id, name")
    .eq("community_id", c.id)
    .eq("kind", "discussion")
    .order("position")
    .limit(1)
    .maybeSingle();

  let messages: ChannelMessage[] = [];
  if (isMember && channel) {
    const { data } = await supabase
      .from("channel_messages")
      .select("*, profiles:author_id(full_name, handle, avatar_url)")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: true })
      .limit(100);
    messages = (data as ChannelMessage[]) ?? [];
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
          {!isMember && (
            <form action={joinCommunity} className="ml-auto">
              <input type="hidden" name="community_id" value={c.id} />
              <input type="hidden" name="slug" value={c.slug} />
              <button className="rounded-sm bg-primary px-5 py-2.5 text-small font-semibold text-white">
                Join community (+15 XP)
              </button>
            </form>
          )}
          {isMember && (
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

        {!isMember ? (
          <div className="p-10 text-center text-text-secondary">
            Join the community to read and post in the discussion.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 p-5 max-h-[420px] overflow-auto">
              {messages.length ? (
                messages.map((m) => (
                  <div key={m.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
                      {(m.profiles?.full_name || "M").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-small">
                        <span className="font-semibold">{m.profiles?.full_name || "Member"}</span>
                        <span className="text-text-secondary"> · {new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-body whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-text-secondary py-6">
                  No messages yet — say hello 👋
                </p>
              )}
            </div>

            {channel && (
              <form action={sendMessage} className="flex gap-2 border-t border-border p-4">
                <input type="hidden" name="channel_id" value={channel.id} />
                <input type="hidden" name="community_id" value={c.id} />
                <input type="hidden" name="slug" value={c.slug} />
                <input
                  name="body"
                  required
                  autoComplete="off"
                  placeholder="Message #discussion…"
                  className="flex-1 rounded-sm border border-border px-4 py-2.5 text-body"
                />
                <button className="rounded-sm bg-primary px-5 py-2.5 text-small font-semibold text-white">
                  Send
                </button>
              </form>
            )}
          </>
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
