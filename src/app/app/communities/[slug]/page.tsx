import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { joinCommunity, leaveCommunity, createChannel, deleteChannel } from "../actions";
import ChannelChat from "./ChannelChat";
import type { ChannelMessage, Community } from "@/lib/types";
import { memberLabel } from "@/lib/plural";

export const dynamic = "force-dynamic";

type Channel = { id: string; name: string; kind: string; position: number };
type JoinedProfile = { id: string; full_name: string | null; handle: string | null; avatar_url: string | null };
type MemberRow = { user_id: string; role: string; xp: number | null; profiles: JoinedProfile | JoinedProfile[] | null };

// Top-level tabs shown on every community. `discussion` is the default view.
const TABS: { key: string; label: string }[] = [
  { key: "discussion", label: "Discussion" },
  { key: "live", label: "Live" },
  { key: "members", label: "Members" },
  { key: "leaderboard", label: "Leaderboard" },
];

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "C"
  );
}

export default async function CommunityHome(
  props: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ channel?: string; tab?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

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
      .select("user_id, role, xp, profiles:user_id(id, full_name, handle, avatar_url)")
      .eq("community_id", c.id)
      .eq("status", "active");
    members = (rows ?? [])
      .map((r: MemberRow) => {
        // Supabase may return the joined profile as an object or a one-element array.
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          // Fall back to the row's user_id so a member never disappears even if
          // the profile join is missing.
          id: p?.id ?? r.user_id,
          role: r.role,
          full_name: p?.full_name || "Member",
          handle: p?.handle ?? null,
          avatar_url: p?.avatar_url ?? null,
          xp: r.xp ?? 0,
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
    <div className="mx-auto max-w-6xl">
      <Link href="/app/communities" className="text-[13px] font-medium text-text-secondary hover:text-ink">
        {"←"} All communities
      </Link>

      {/* Header band */}
      <div className="mt-3 rounded-2xl border border-border bg-white shadow-card">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-[14px] font-semibold text-ink">
              {initials(c.name)}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Community</p>
              <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
                {c.name}
              </h1>
              <p className="mt-1 max-w-2xl text-[15px] text-text-secondary">
                {c.description || (
                  <>
                    A place to <em className="accent-serif">grow together</em> on ASCENDR.
                  </>
                )}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-text-secondary">
                <span className="rounded-full bg-surface px-2.5 py-1 font-medium text-ink">
                  {memberLabel(c.member_count)}
                </span>
                <span className="rounded-full bg-surface px-2.5 py-1 font-medium text-ink">
                  {channels.length} channel{channels.length === 1 ? "" : "s"}
                </span>
                {isMod && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium capitalize text-brand-700">
                    {membership?.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isMod && (
              <Link
                href={`/app/communities/${c.slug}/mentor`}
                className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40"
              >
                Mentor workspace
              </Link>
            )}
            {!isMember ? (
              <form action={joinCommunity}>
                <input type="hidden" name="community_id" value={c.id} />
                <input type="hidden" name="slug" value={c.slug} />
                <button className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
                  Join community
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-medium text-emerald-800">
                  {"✓"} Member
                </span>
                {membership?.role === "owner" ? null : (
                  <form action={leaveCommunity}>
                    <input type="hidden" name="community_id" value={c.id} />
                    <input type="hidden" name="slug" value={c.slug} />
                    <button className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-text-secondary hover:border-danger/40 hover:text-danger">
                      Leave
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top tab bar */}
        {isMember && (
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 md:px-4">
            {TABS.map((t) => {
              const activeTab = t.key === tab;
              const href = t.key === "live" ? `/app/communities/${c.slug}/live` : tabHref(t.key);
              return (
                <Link
                  key={t.key}
                  href={href}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[14px] font-medium ${
                    activeTab
                      ? "border-ink text-ink"
                      : "border-transparent text-text-secondary hover:text-ink"
                  }`}
                >
                  {t.key === "live" && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {searchParams.error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[14px] text-danger">
          {searchParams.error}
        </div>
      )}

      {!isMember ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <div className="text-[15px] font-semibold text-ink">Join to see the conversation</div>
          <p className="mt-1 text-[14px] text-text-secondary">
            Members can read and post in channels, join live sessions and climb the leaderboard.
          </p>
          <form action={joinCommunity} className="mt-4 inline-block">
            <input type="hidden" name="community_id" value={c.id} />
            <input type="hidden" name="slug" value={c.slug} />
            <button className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
              Join community
            </button>
          </form>
        </div>
      ) : tab === "discussion" ? (
        !active ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <div className="text-[15px] font-semibold text-ink">No channels yet</div>
            <p className="mt-1 text-[14px] text-text-secondary">
              {isMod ? "Add a channel to get the conversation going." : "A moderator will add channels soon."}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
            {/* Channel column */}
            <aside className="h-fit">
              <div className="px-2 pb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                Channels
              </div>
              <div className="flex flex-col gap-0.5">
                {channels.map((ch) => {
                  const isActive = ch.id === active.id;
                  return (
                    <div
                      key={ch.id}
                      className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-[14px] ${
                        isActive
                          ? "bg-white font-semibold text-ink shadow-card"
                          : "text-text-secondary hover:bg-surface hover:text-ink"
                      }`}
                    >
                      <Link href={`/app/communities/${c.slug}?channel=${ch.id}`} className="flex-1 truncate">
                        <span className="text-text-secondary">#</span> {ch.name}
                      </Link>
                      {unreadChannels.has(ch.id) && !isActive && (
                        <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread messages" />
                      )}
                      {isMod && channels.length > 1 && (
                        <form action={deleteChannel} className="opacity-0 group-hover:opacity-100">
                          <input type="hidden" name="community_id" value={c.id} />
                          <input type="hidden" name="slug" value={c.slug} />
                          <input type="hidden" name="channel_id" value={ch.id} />
                          <button
                            title={`Delete #${ch.name}`}
                            className="text-[12px] text-text-secondary hover:text-danger"
                          >
                            {"✕"}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>

              {isMod && (
                <form action={createChannel} className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  <input type="hidden" name="community_id" value={c.id} />
                  <input type="hidden" name="slug" value={c.slug} />
                  <label htmlFor="new-channel" className="text-[12px] font-medium text-text-secondary">
                    New channel
                  </label>
                  <input
                    id="new-channel"
                    name="name"
                    required
                    placeholder="new-channel"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[14px] text-ink"
                  />
                  <button className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40">
                    Add channel
                  </button>
                </form>
              )}
            </aside>

            {/* Messages card */}
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
              <div className="border-b border-border px-5 py-4 text-[15px] font-semibold text-ink">
                <span className="text-text-secondary">#</span> {active.name}
              </div>
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
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-card">
          <div className="border-b border-border px-5 py-4 text-[15px] font-semibold text-ink">Leaderboard</div>
          <ol className="divide-y divide-border">
            {members.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                    i === 0
                      ? "bg-amber-50 text-amber-800"
                      : i < 3
                      ? "bg-brand-50 text-brand-700"
                      : "bg-surface text-text-secondary"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
                  {m.full_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-[14px] font-semibold text-ink">{m.full_name}</span>
                {m.role !== "member" && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[12px] font-medium capitalize text-brand-700">
                    {m.role}
                  </span>
                )}
                <span className="ml-auto text-[14px] font-semibold text-ink">{m.xp} XP</span>
              </li>
            ))}
            {!members.length && (
              <li className="px-5 py-8 text-center text-[14px] text-text-secondary">No members yet.</li>
            )}
          </ol>
        </div>
      ) : tab === "members" ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-card">
          <div className="border-b border-border px-5 py-4 text-[15px] font-semibold text-ink">
            Members <span className="font-normal text-text-secondary">({members.length})</span>
          </div>
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
                  {m.full_name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-ink">{m.full_name}</div>
                  {m.handle && <div className="text-[12px] text-text-secondary">@{m.handle}</div>}
                </div>
                {m.role !== "member" && (
                  <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-[12px] font-medium capitalize text-brand-700">
                    {m.role}
                  </span>
                )}
              </li>
            ))}
            {!members.length && (
              <li className="px-5 py-8 text-center text-[14px] text-text-secondary">No members yet.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
