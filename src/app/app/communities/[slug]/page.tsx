import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { joinCommunity, createChannel, deleteChannel } from "../actions";
import ChannelChat from "./ChannelChat";
import { AskMentorPanel } from "@/components/mentor/AskMentorPanel";
import type { ChannelMessage, Community } from "@/lib/types";

export const dynamic = "force-dynamic";

type Channel = { id: string; name: string; kind: string; position: number };

// Top-level tabs shown on every community. `discussion` is the default view.
const TABS: { key: string; label: string; icon: string }[] = [
  { key: "discussion", label: "Discussion", icon: "💬" },
  { key: "courses", label: "Courses", icon: "🎓" },
  { key: "live", label: "Live", icon: "◉" },
  { key: "members", label: "Members", icon: "👥" },
  { key: "leaderboard", label: "Leaderboard", icon: "🏆" },
  { key: "events", label: "Events", icon: "📅" },
  { key: "resources", label: "Resources", icon: "📎" },
];

export default async function CommunityHome({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { channel?: string; tab?: string };
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

  const tab = TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab! : "discussion";

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

  // Members list + leaderboard (members ordered by XP) — loaded for those tabs.
  let members: { id: string; role: string; full_name: string; handle: string | null; avatar_url: string | null; xp: number }[] = [];
  if (isMember && (tab === "members" || tab === "leaderboard")) {
    const { data: rows } = await supabase
      .from("community_members")
      .select("user_id, role, profiles:user_id(id, full_name, handle, avatar_url, xp)")
      .eq("community_id", c.id)
      .eq("status", "active");
    members = (rows ?? [])
      .map((r: any) => {
        // Supabase can return the joined `profiles` as either an object or a
        // single-element array depending on the relationship inference — handle both.
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          // Fall back to the row's user_id so a member never disappears even if
          // the profile join is missing.
          id: p?.id ?? r.user_id,
          role: r.role,
          full_name: p?.full_name || "Member",
          handle: p?.handle ?? null,
          avatar_url: p?.avatar_url ?? null,
          xp: p?.xp ?? 0,
        };
      })
      .filter((m) => m.id);
    if (tab === "leaderboard") members.sort((a, b) => b.xp - a.xp);
  }

  // Messages + reactions for the active channel.
  let messages: (ChannelMessage & { reactions?: { emoji: string; user_id: string }[] })[] = [];
  if (isMember && active && tab === "discussion") {
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

  const tabHref = (key: string) => `/app/communities/${c.slug}?tab=${key}`;

  return (
    <div className="max-w-5xl mx-auto">
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

        {/* Top tab bar */}
        {isMember && (
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3">
            {TABS.map((t) => {
              const activeTab = t.key === tab;
              const href = t.key === "live" ? `/app/communities/${c.slug}/live` : tabHref(t.key);
              return (
                <Link
                  key={t.key}
                  href={href}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-small font-semibold ${
                    activeTab
                      ? "border-primary text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span aria-hidden>{t.icon}</span>
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {!isMember ? (
        <div className="mt-5 rounded-md border border-border bg-card p-10 text-center text-text-secondary">
          Join the community to read and post in its channels.
        </div>
      ) : tab === "discussion" ? (
        !active ? (
          <div className="mt-5 rounded-md border border-border bg-card p-10 text-center text-text-secondary">
            No channels yet.
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
                  <div
                    key={ch.id}
                    className={`group flex items-center gap-2 rounded-sm px-2 py-2 text-small font-semibold ${
                      ch.id === active.id ? "bg-[#eef2ff] text-primary" : "text-text-secondary hover:bg-bg"
                    }`}
                  >
                    <Link href={`/app/communities/${c.slug}?channel=${ch.id}`} className="flex-1">
                      # {ch.name}
                    </Link>
                    {unreadChannels.has(ch.id) && ch.id !== active.id && (
                      <span className="h-2 w-2 rounded-full bg-danger" />
                    )}
                    {isMod && channels.length > 1 && (
                      <form action={deleteChannel} className="opacity-0 group-hover:opacity-100">
                        <input type="hidden" name="community_id" value={c.id} />
                        <input type="hidden" name="slug" value={c.slug} />
                        <input type="hidden" name="channel_id" value={ch.id} />
                        <button
                          title={`Delete #${ch.name}`}
                          className="text-caption text-text-secondary hover:text-danger"
                        >
                          ✕
                        </button>
                      </form>
                    )}
                  </div>
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

              {isMod && (
                <Link
                  href={`/app/communities/${c.slug}/mentor`}
                  className="mt-3 flex items-center justify-center gap-1 rounded-sm border border-accent bg-[#ecfdf5] px-2 py-2 text-caption font-semibold text-[#047857] hover:bg-[#d1fae5]"
                >
                  ✦ Mentor Workspace
                </Link>
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
        )
      ) : tab === "leaderboard" ? (
        <div className="mt-5 rounded-md border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3 font-semibold">Leaderboard</div>
          <ol className="divide-y divide-border">
            {members.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-caption font-bold ${
                    i === 0
                      ? "bg-[#fef9c3] text-[#a16207]"
                      : i === 1
                      ? "bg-[#f1f5f9] text-[#475569]"
                      : i === 2
                      ? "bg-[#fef3c7] text-[#b45309]"
                      : "bg-bg text-text-secondary"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-semibold">{m.full_name}</span>
                {m.role !== "member" && (
                  <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-caption font-semibold text-primary">
                    {m.role}
                  </span>
                )}
                <span className="ml-auto text-small font-semibold text-accent">{m.xp} XP</span>
              </li>
            ))}
            {!members.length && (
              <li className="px-5 py-8 text-center text-text-secondary">No members yet.</li>
            )}
          </ol>
        </div>
      ) : tab === "members" ? (
        <div className="mt-5 rounded-md border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3 font-semibold">Members ({members.length})</div>
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-small font-bold text-white">
                  {m.full_name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{m.full_name}</div>
                  {m.handle && <div className="text-caption text-text-secondary">@{m.handle}</div>}
                </div>
                {m.role !== "member" && (
                  <span className="ml-auto rounded-full bg-[#eef2ff] px-2 py-0.5 text-caption font-semibold text-primary">
                    {m.role}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // Courses / Events / Resources — placeholder scaffolds ready for content.
        <div className="mt-5 rounded-md border border-dashed border-border bg-card p-10 text-center">
          <div className="text-h3 mb-2" aria-hidden>
            {TABS.find((t) => t.key === tab)?.icon}
          </div>
          <div className="font-semibold">{TABS.find((t) => t.key === tab)?.label}</div>
          <p className="mt-1 text-small text-text-secondary">
            {tab === "courses"
              ? "Structured lessons for this community are coming soon."
              : tab === "events"
              ? "Upcoming events and RSVPs will appear here."
              : "Shared files, links, and resources will live here."}
          </p>
          {isMod && (
            <p className="mt-3 text-caption text-text-secondary">
              As a moderator you will be able to add {TABS.find((t) => t.key === tab)?.label.toLowerCase()} here.
            </p>
          )}
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
