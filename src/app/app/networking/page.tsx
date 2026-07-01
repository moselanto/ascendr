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

  // If a DM is open, show the thread full-width with a back link.
  if (dmPeer) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/app/networking" className="text-small text-primary font-semibold">
          ← Back to networking
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold">
            {initials(dmPeer.full_name)}
          </div>
          <div>
            <Link href={`/app/members/${dmPeer.id}`} className="font-semibold hover:text-primary">
              {dmPeer.full_name || "Member"}
            </Link>
            <div className="text-caption text-text-secondary capitalize">{dmPeer.role}</div>
          </div>
        </div>
        <DmThread
          meId={myId}
          peerId={dmPeer.id}
          initialMessages={dmMessages}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-h3 font-bold">Networking</h1>
        <p className="text-small text-text-secondary">Connect with people and message your network.</p>
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div>
          <div className="mb-2 text-small font-bold uppercase tracking-wide text-text-secondary">
            Requests ({incoming.length})
          </div>
          <div className="flex flex-col gap-2">
            {incoming.map((c) => {
              const p = profMap.get(c.requester_id);
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
                    {initials(p?.full_name)}
                  </div>
                  <Link href={`/app/members/${c.requester_id}`} className="font-semibold hover:text-primary">
                    {p?.full_name || "Member"}
                  </Link>
                  <div className="ml-auto flex gap-2">
                    <form action={respondToConnection}>
                      <input type="hidden" name="connection_id" value={c.id} />
                      <input type="hidden" name="decision" value="accepted" />
                      <button className="rounded-sm bg-primary px-3 py-1.5 text-caption font-semibold text-white">Accept</button>
                    </form>
                    <form action={respondToConnection}>
                      <input type="hidden" name="connection_id" value={c.id} />
                      <input type="hidden" name="decision" value="declined" />
                      <button className="rounded-sm border border-border px-3 py-1.5 text-caption font-semibold text-text-secondary">Decline</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My connections */}
      <div>
        <div className="mb-2 text-small font-bold uppercase tracking-wide text-text-secondary">
          My connections ({accepted.length})
        </div>
        {accepted.length === 0 ? (
          <p className="text-small text-text-secondary">No connections yet — send a request below.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {accepted.map((c) => {
              const otherId = c.requester_id === myId ? c.addressee_id : c.requester_id;
              const p = profMap.get(otherId);
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
                    {initials(p?.full_name)}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/app/members/${otherId}`} className="font-semibold hover:text-primary block truncate">
                      {p?.full_name || "Member"}
                    </Link>
                    <div className="text-caption text-text-secondary capitalize truncate">{p?.role}</div>
                  </div>
                  <Link
                    href={`/app/networking?dm=${otherId}`}
                    className="ml-auto rounded-sm border border-primary px-3 py-1.5 text-caption font-semibold text-primary"
                  >
                    Message
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Discover people */}
      <div>
        <div className="mb-2 text-small font-bold uppercase tracking-wide text-text-secondary">
          People you may know
        </div>
        {discover.length === 0 ? (
          <p className="text-small text-text-secondary">No new people to show right now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discover.map((p) => (
              <div key={p.id} className="rounded-md border border-border bg-card p-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold">
                  {initials(p.full_name)}
                </div>
                <Link href={`/app/members/${p.id}`} className="mt-2 block font-semibold hover:text-primary">
                  {p.full_name || "Member"}
                </Link>
                <div className="text-caption text-text-secondary capitalize">{p.role}</div>
                <form action={sendConnectionRequest} className="mt-3">
                  <input type="hidden" name="addressee_id" value={p.id} />
                  <button className="w-full rounded-sm bg-primary px-3 py-2 text-caption font-semibold text-white">
                    + Connect
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
