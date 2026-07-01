import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Prof = {
  id: string;
  full_name: string | null;
  handle: string | null;
  role: string;
  bio: string | null;
  verified_expert: boolean;
};

function initials(name: string | null) {
  return (
    (name || "Member")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M"
  );
}

const ROLE_PILL: Record<string, string> = {
  mentor: "bg-[#eef2ff] text-primary",
  admin: "bg-[#fef2f2] text-danger",
  employer: "bg-[#fffbeb] text-[#b45309]",
};

export default async function MembersDirectory({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = (searchParams.q || "").trim();

  let query = supabase
    .from("profiles")
    .select("id, full_name, handle, role, bio, verified_expert")
    .order("created_at", { ascending: false })
    .limit(60);
  if (q) query = query.ilike("full_name", `%${q}%`);

  const { data: profiles } = await query;
  const members = (profiles as Prof[]) ?? [];

  // XP totals for these members (batched), for a quick sortable signal.
  const ids = members.map((m) => m.id);
  const xpByUser = new Map<string, number>();
  if (ids.length) {
    const { data: xp } = await supabase
      .from("xp_events")
      .select("user_id, points")
      .in("user_id", ids);
    (xp ?? []).forEach((e) => xpByUser.set(e.user_id, (xpByUser.get(e.user_id) ?? 0) + (e.points ?? 0)));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-h3 font-bold">Members</h1>
        <p className="text-small text-text-secondary">Discover people across ASCENDR.</p>
      </div>

      <form className="mb-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search members by name…"
          className="w-full max-w-md rounded-full border border-border bg-bg px-4 py-2.5 text-small outline-none focus:border-primary"
        />
      </form>

      {members.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-text-secondary">
          {q ? `No members match "${q}".` : "No members yet."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/app/members/${m.id}`}
              className="rounded-md border border-border bg-card p-4 text-center hover:border-primary"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold">
                {initials(m.full_name)}
              </div>
              <div className="mt-2 font-semibold flex items-center justify-center gap-1">
                {m.full_name || "Member"}
                {m.verified_expert && <span title="Verified expert" className="text-primary">✔</span>}
              </div>
              {m.role !== "member" && (
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-caption font-semibold capitalize ${ROLE_PILL[m.role] ?? "bg-bg text-text-secondary"}`}>
                  {m.role}
                </span>
              )}
              {m.bio && <p className="mt-2 text-caption text-text-secondary line-clamp-2">{m.bio}</p>}
              <div className="mt-2 text-caption text-text-secondary">{xpByUser.get(m.id) ?? 0} XP</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
