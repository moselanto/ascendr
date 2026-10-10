import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import type { Community } from "@/lib/types";
import { memberLabel } from "@/lib/plural";

export const dynamic = "force-dynamic";

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

export default async function CommunitiesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

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
  const discoverList = list.filter((c) => !joined.has(c.id));

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
    <div className="mx-auto max-w-5xl">
      {/* Page head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Communities</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            Grow with <em className="accent-serif">your people</em>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Join spaces built around careers, skills and mentors. Talk in channels, show up to live sessions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/communities/new"
            className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
          >
            Create community
          </Link>
        </div>
      </div>

      {/* My communities */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Your communities</h2>
          <span className="text-[12px] text-text-secondary">{joinedList.length} joined</span>
        </div>
        {joinedList.length ? (
          <div className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
            {joinedList.map((c) => (
              <Link
                key={c.id}
                href={`/app/communities/${c.slug}`}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{c.name}</div>
                  <p className="truncate text-[13px] text-text-secondary">
                    {c.description || "A community on ASCENDR."}
                  </p>
                </div>
                <span className="hidden text-[12px] text-text-secondary sm:inline">{memberLabel(c.member_count)}</span>
                {unread.has(c.id) ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                    New
                  </span>
                ) : (
                  <span className="text-[14px] text-text-secondary" aria-hidden>
                    {"→"}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <div className="text-[15px] font-semibold text-ink">You have not joined a community yet</div>
            <p className="mt-1 text-[14px] text-text-secondary">
              Pick one below to start talking with people on the same path, or start your own.
            </p>
            <Link
              href="/app/communities/new"
              className="mt-4 inline-block rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40"
            >
              Create a community
            </Link>
          </div>
        )}
      </section>

      {/* Discovery */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Discover</h2>
          <span className="text-[12px] text-text-secondary">{discoverList.length} open to join</span>
        </div>
        {discoverList.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoverList.map((c) => (
              <Link
                key={c.id}
                href={`/app/communities/${c.slug}`}
                className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-card transition hover:shadow-lift md:p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">
                  {initials(c.name)}
                </span>
                <div className="mt-4 text-[15px] font-semibold text-ink">{c.name}</div>
                <p className="mt-1 line-clamp-2 flex-1 text-[13px] text-text-secondary">
                  {c.description || "A community on ASCENDR."}
                </p>
                <div className="mt-4 flex items-center justify-between text-[12px] text-text-secondary">
                  <span>{memberLabel(c.member_count)}</span>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
                    View {"→"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <div className="text-[15px] font-semibold text-ink">
              {list.length ? "You are in every community" : "No communities yet"}
            </div>
            <p className="mt-1 text-[14px] text-text-secondary">
              {list.length
                ? "New communities will show up here as people create them."
                : "Be the first to start one and invite people who share your goals."}
            </p>
            <Link
              href="/app/communities/new"
              className="mt-4 inline-block rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
            >
              Create the first one
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
