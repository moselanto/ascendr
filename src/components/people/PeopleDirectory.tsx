import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { getViewerContext, enrichPeople, initials, type PersonCard } from "@/lib/people";
import { sendConnectionRequest, respondToConnection } from "@/app/app/net-actions";

/**
 * People directory used by /app/members (everyone) and /app/mentors
 * (mentors and verified experts). Ranked by traceable relevance to the
 * viewer's goal, with the reasons shown on every card.
 */

const ROLE_LABEL: Record<string, string> = { mentor: "Mentor", admin: "Admin", employer: "Employer", member: "Member" };

export function ConnectButton({ p, compact = false }: { p: PersonCard; compact?: boolean }) {
  const size = compact ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]";
  if (p.connection === "connected") {
    return <span className={`rounded-full bg-emerald-50 font-medium text-emerald-800 ${size}`}>Connected</span>;
  }
  if (p.connection === "pending_out") {
    return <span className={`rounded-full bg-surface font-medium text-text-secondary ${size}`}>Request sent</span>;
  }
  if (p.connection === "pending_in" && p.connectionId) {
    return (
      <form action={respondToConnection}>
        <input type="hidden" name="connection_id" value={p.connectionId} />
        <input type="hidden" name="decision" value="accepted" />
        <button className={`rounded-full bg-ink font-medium text-white hover:bg-ink-700 ${size}`}>Accept request</button>
      </form>
    );
  }
  return (
    <form action={sendConnectionRequest}>
      <input type="hidden" name="addressee_id" value={p.id} />
      <button className={`rounded-full bg-ink font-medium text-white hover:bg-ink-700 ${size}`}>Connect</button>
    </form>
  );
}

export async function PeopleDirectory({ q, mode }: { q: string; mode: "all" | "mentors" }) {
  const me = await getCurrentProfile();
  const supabase = createClient();
  const ctx = await getViewerContext(me?.id ?? "");

  let query = supabase
    .from("profiles")
    .select("id, full_name, handle, role, bio, verified_expert")
    .order("created_at", { ascending: false })
    .limit(80);
  if (mode === "mentors") query = query.or("role.eq.mentor,verified_expert.eq.true");
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;

  const people = (await enrichPeople(ctx, (data ?? []) as never[])).sort((a, b) => b.score - a.score);
  const top = people.filter((p) => p.reasons.length > 0 && p.score > 1).slice(0, 3);
  const base = mode === "mentors" ? "/app/mentors" : "/app/members";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">{mode === "mentors" ? "Mentors & experts" : "People"}</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            {mode === "mentors" ? "People who have made your move" : "People relevant to your next move"}
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Ranked by your goal{ctx.roleTitle ? ` (${ctx.roleTitle})` : ""}. Every match says why.
          </p>
        </div>
        <form action={base} className="flex w-full max-w-sm gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-[14px] outline-none focus:border-ink/30"
          />
          <button className="rounded-full border border-ink/15 bg-white px-4 text-[13px] font-medium text-ink hover:border-ink/40">Search</button>
        </form>
      </div>

      <div className="flex gap-1 rounded-full bg-white p-1 shadow-card w-fit border border-border">
        <Link href="/app/members" className={`rounded-full px-4 py-1.5 text-[13px] font-medium ${mode === "all" ? "bg-ink text-white" : "text-text-secondary hover:text-ink"}`}>
          Everyone
        </Link>
        <Link href="/app/mentors" className={`rounded-full px-4 py-1.5 text-[13px] font-medium ${mode === "mentors" ? "bg-ink text-white" : "text-text-secondary hover:text-ink"}`}>
          Mentors & experts
        </Link>
      </div>

      {top.length > 0 && q === "" && (
        <section>
          <h2 className="mb-3 text-[17px] font-semibold tracking-tight text-ink">Best matches for you</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {top.map((p) => (
              <div key={p.id} className="flex flex-col rounded-2xl bg-ink p-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold">{initials(p.full_name)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{p.full_name || "Member"}</p>
                    <p className="text-[12px] text-white/60">{ROLE_LABEL[p.role] ?? p.role}</p>
                  </div>
                </div>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {p.reasons.map((r) => (
                    <li key={r} className="flex gap-2 text-[13px] text-white/80">
                      <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-300" />
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center gap-2">
                  <Link href={`/app/members/${p.id}`} className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-ink hover:bg-brand-50">
                    View profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[17px] font-semibold tracking-tight text-ink">
          {q ? `Results for \u201c${q}\u201d` : mode === "mentors" ? "All mentors & experts" : "Everyone"}
          <span className="ml-2 text-[13px] font-normal text-text-secondary">{people.length}</span>
        </h2>
        {people.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <p className="text-[15px] font-medium text-ink">{q ? "No one matches that name" : mode === "mentors" ? "No mentors yet" : "No members yet"}</p>
            <p className="mt-1 text-[13px] text-text-secondary">
              {mode === "mentors" ? "Mentors who cover your gaps will appear here as they join." : "Invite colleagues to grow your network."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((p) => (
              <div key={p.id} className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-lift">
                <Link href={`/app/members/${p.id}`} className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-700">
                    {initials(p.full_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-ink">
                      {p.full_name || "Member"}
                      {p.verified_expert && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Verified</span>}
                    </p>
                    <p className="text-[12px] text-text-secondary">
                      {ROLE_LABEL[p.role] ?? p.role}
                      {p.handle ? ` \u00b7 @${p.handle}` : ""}
                    </p>
                  </div>
                </Link>
                {p.bio && <p className="mt-3 line-clamp-2 text-[13px] text-text-secondary">{p.bio}</p>}
                {p.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {p.reasons.slice(0, 2).map((r) => (
                      <li key={r} className="flex gap-2 text-[12px] text-ink/80">
                        <span aria-hidden className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <ConnectButton p={p} compact />
                  <Link href={`/app/members/${p.id}`} className="rounded-full border border-ink/15 px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40">
                    Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
