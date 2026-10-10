import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { sendConnectionRequest, respondToConnection } from "../net-actions";
import DmThread from "./DmThread";

export const dynamic = "force-dynamic";

function initials(name: string | null | undefined) {
  return (
    (name || "Member")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M"
  );
}

type Prof = { id: string; full_name: string | null; role: string; bio: string | null };

function Avatar({ name }: { name: string | null | undefined }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
      {initials(name)}
    </span>
  );
}

const primarySm =
  "rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink-700";
const secondarySm =
  "rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40";
const sectionTitle = "text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary";

export default async function NetworkingPage({
  searchParams,
}: {
  searchParams: { dm?: string };
}) {
  const me = await getCurrentProfile();
  const supabase = createClient();
  const myId = me!.id;

  // All my connection rows (either side).
  const { data: connRows } = await supabase
    .from("connections")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  const conns = connRows ?? [];

  const incoming = conns.filter((c) => c.addressee_id === myId && c.status === "pending");
  const outgoing = conns.filter((c) => c.requester_id === myId && c.status === "pending");
  const accepted = conns.filter((c) => c.status === "accepted");
  const connectedIds = new Set<string>();
  const pendingIds = new Set<string>();
  conns.forEach((c) => {
    const other = c.requester_id === myId ? c.addressee_id : c.requester_id;
    if (c.status === "accepted") connectedIds.add(other);
    if (c.status === "pending") pendingIds.add(other);
  });

  // Fetch profile details for everyone involved + a discover list.
  const involvedIds = Array.from(new Set(conns.flatMap((c) => [c.requester_id, c.addressee_id])));
  const profMap = new Map<string, Prof>();
  if (involvedIds.length) {
    const { data: ps } = await supabase
      .from("profiles")
      .select("id, full_name, role, bio")
      .in("id", involvedIds);
    (ps as Prof[] | null)?.forEach((p) => profMap.set(p.id, p));
  }

  // Unread DMs addressed to me, grouped by sender (for the conversations list).
  const { data: unreadRows } = await supabase
    .from("direct_messages")
    .select("sender_id")
    .eq("recipient_id", myId)
    .is("read_at", null)
    .limit(500);
  const unreadBySender = new Map<string, number>();
  ((unreadRows as { sender_id: string }[] | null) ?? []).forEach((r) =>
    unreadBySender.set(r.sender_id, (unreadBySender.get(r.sender_id) ?? 0) + 1)
  );

  // Discover: recent profiles that aren't me and aren't already connected/pending.
  const { data: discoverRows } = await supabase
    .from("profiles")
    .select("id, full_name, role, bio")
    .neq("id", myId)
    .order("created_at", { ascending: false })
    .limit(24);
  const discover = ((discoverRows as Prof[]) ?? []).filter(
    (p) => !connectedIds.has(p.id) && !pendingIds.has(p.id)
  );

  // Active DM target (via ?dm=<profileId>), only if provided.
  const dmId = searchParams.dm || "";
  let dmPeer: Prof | null = null;
  let dmMessages: { id: string; sender_id: string; body: string; created_at: string }[] = [];
  if (dmId) {
    const { data: peer } = await supabase
      .from("profiles")
      .select("id, full_name, role, bio")
      .eq("id", dmId)
      .maybeSingle();
    dmPeer = (peer as Prof) ?? null;
    if (dmPeer) {
      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("id, sender_id, body, created_at")
        .or(
          `and(sender_id.eq.${myId},recipient_id.eq.${dmId}),and(sender_id.eq.${dmId},recipient_id.eq.${myId})`
        )
        .order("created_at", { ascending: true })
        .limit(100);
      dmMessages = msgs ?? [];
    }
  }

  const contacts = accepted.map((c) => {
    const otherId = c.requester_id === myId ? c.addressee_id : c.requester_id;
    return { connectionId: c.id, id: otherId, profile: profMap.get(otherId) };
  });
  const totalUnread = Array.from(unreadBySender.values()).reduce((s, n) => s + n, 0);

  const head = (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Network</p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
          People who <span className="accent-serif">lift you up</span>
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Manage requests, grow your connections and message your network.
        </p>
      </div>
      <div className="flex items-center gap-2 self-start md:self-auto">
        <span className="rounded-full bg-surface px-3 py-1.5 text-[12px] font-medium text-text-secondary">
          {accepted.length} connection{accepted.length === 1 ? "" : "s"}
        </span>
        {totalUnread > 0 && (
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700">
            {totalUnread} unread
          </span>
        )}
      </div>
    </div>
  );

  // Conversations list (shared by both views).
  const conversations = (
    <div className="rounded-2xl border border-border bg-white p-0 shadow-card">
      <div className="flex items-center justify-between px-5 py-4">
        <span className={sectionTitle}>Messages</span>
        {dmPeer && (
          <Link href="/app/networking" className="text-[12px] font-medium text-text-secondary hover:text-ink">
            ← Network
          </Link>
        )}
      </div>
      {contacts.length === 0 ? (
        <p className="border-t border-border px-5 py-4 text-[13px] text-text-secondary">
          Connect with someone to start a conversation.
        </p>
      ) : (
        <ul className="max-h-[520px] divide-y divide-border overflow-y-auto border-t border-border">
          {contacts.map((c) => {
            const unread = unreadBySender.get(c.id) ?? 0;
            const active = dmPeer?.id === c.id;
            return (
              <li key={c.connectionId}>
                <Link
                  href={`/app/networking?dm=${c.id}`}
                  className={`flex items-center gap-3 px-5 py-4 ${active ? "bg-surface" : "hover:bg-surface"}`}
                >
                  <Avatar name={c.profile?.full_name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">
                      {c.profile?.full_name || "Member"}
                    </span>
                    <span className="block truncate text-[12px] capitalize text-text-secondary">
                      {c.profile?.role}
                    </span>
                  </span>
                  {unread > 0 && (
                    <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // DM open: two-pane layout (conversations + thread), stacked on mobile with the thread first.
  if (dmPeer) {
    return (
      <div className="mx-auto max-w-5xl">
        {head}
        <div className="mt-6 grid gap-5 md:grid-cols-[300px_1fr]">
          <div className="order-2 md:order-1">{conversations}</div>
          <div className="order-1 flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card md:order-2">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <Avatar name={dmPeer.full_name} />
              <div className="min-w-0">
                <Link
                  href={`/app/members/${dmPeer.id}`}
                  className="block truncate text-[15px] font-semibold text-ink hover:text-brand-700"
                >
                  {dmPeer.full_name || "Member"}
                </Link>
                <div className="truncate text-[12px] capitalize text-text-secondary">{dmPeer.role}</div>
              </div>
              {connectedIds.has(dmPeer.id) && (
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[12px] text-text-secondary">
                  <span className="h-2 w-2 rounded-full bg-accent" /> Connected
                </span>
              )}
            </div>
            <DmThread meId={myId} peerId={dmPeer.id} initialMessages={dmMessages} peerName={dmPeer.full_name} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {head}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Incoming requests */}
          <section>
            <div className="mb-2 px-1">
              <span className={sectionTitle}>Requests received ({incoming.length})</span>
            </div>
            {incoming.length === 0 ? (
              <div className="rounded-2xl border border-border bg-white px-5 py-4 text-[14px] text-text-secondary shadow-card">
                No pending requests. You&apos;re all caught up.
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
                {incoming.map((c) => {
                  const p = profMap.get(c.requester_id);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <Avatar name={p?.full_name} />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/app/members/${c.requester_id}`}
                          className="block truncate text-[14px] font-medium text-ink hover:text-brand-700"
                        >
                          {p?.full_name || "Member"}
                        </Link>
                        <div className="truncate text-[12px] capitalize text-text-secondary">
                          {p?.role} · wants to connect
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <form action={respondToConnection}>
                          <input type="hidden" name="connection_id" value={c.id} />
                          <input type="hidden" name="decision" value="accepted" />
                          <button className={primarySm}>✓ Accept</button>
                        </form>
                        <form action={respondToConnection}>
                          <input type="hidden" name="connection_id" value={c.id} />
                          <input type="hidden" name="decision" value="declined" />
                          <button className={secondarySm}>Decline</button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Outgoing requests */}
          {outgoing.length > 0 && (
            <section>
              <div className="mb-2 px-1">
                <span className={sectionTitle}>Requests sent ({outgoing.length})</span>
              </div>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
                {outgoing.map((c) => {
                  const p = profMap.get(c.addressee_id);
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-4">
                      <Avatar name={p?.full_name} />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/app/members/${c.addressee_id}`}
                          className="block truncate text-[14px] font-medium text-ink hover:text-brand-700"
                        >
                          {p?.full_name || "Member"}
                        </Link>
                        <div className="truncate text-[12px] capitalize text-text-secondary">{p?.role}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-800">
                        Pending
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* My connections */}
          <section>
            <div className="mb-2 px-1">
              <span className={sectionTitle}>My connections ({accepted.length})</span>
            </div>
            {contacts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
                <p className="text-[15px] font-semibold text-ink">No connections yet</p>
                <p className="mt-1 text-[14px] text-text-secondary">
                  Send a request to someone below. Once they accept, you can message them directly.
                </p>
                <a
                  href="#discover"
                  className="mt-4 inline-block rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
                >
                  Find people →
                </a>
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
                {contacts.map((c) => (
                  <li key={c.connectionId} className="flex items-center gap-3 px-5 py-4">
                    <Avatar name={c.profile?.full_name} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/members/${c.id}`}
                        className="block truncate text-[14px] font-medium text-ink hover:text-brand-700"
                      >
                        {c.profile?.full_name || "Member"}
                      </Link>
                      <div className="truncate text-[12px] capitalize text-text-secondary">{c.profile?.role}</div>
                    </div>
                    <Link href={`/app/networking?dm=${c.id}`} className={secondarySm}>
                      Message
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Discover people */}
          <section id="discover">
            <div className="mb-2 px-1">
              <span className={sectionTitle}>People you may know</span>
            </div>
            {discover.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
                <p className="text-[15px] font-semibold text-ink">No new people right now</p>
                <p className="mt-1 text-[14px] text-text-secondary">
                  Join a community to meet members working toward goals like yours.
                </p>
                <Link
                  href="/app/communities"
                  className="mt-4 inline-block rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
                >
                  Browse communities →
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {discover.map((p) => (
                  <div key={p.id} className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-card">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.full_name} />
                      <div className="min-w-0">
                        <Link
                          href={`/app/members/${p.id}`}
                          className="block truncate text-[14px] font-medium text-ink hover:text-brand-700"
                        >
                          {p.full_name || "Member"}
                        </Link>
                        <div className="truncate text-[12px] capitalize text-text-secondary">{p.role}</div>
                      </div>
                    </div>
                    {p.bio && <p className="mt-3 line-clamp-2 text-[13px] text-text-secondary">{p.bio}</p>}
                    <form action={sendConnectionRequest} className="mt-auto pt-4">
                      <input type="hidden" name="addressee_id" value={p.id} />
                      <button className={`w-full ${secondarySm}`}>+ Connect</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-6">{conversations}</aside>
      </div>
    </div>
  );
}
