import Link from "next/link";
import { daysAgoIso, tryAdminClient } from "../_lib/admin-client";
import {
  AdminClientError,
  Card,
  Chip,
  EmptyState,
  PageHead,
  TD,
  TH,
  displayName,
  formatDate,
  formatNumber,
} from "../_components/ui";

export const dynamic = "force-dynamic";

/** Read-only members directory. Role editing is intentionally out of scope. */

type MemberRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  role: string;
  verified_expert: boolean | null;
  created_at: string | null;
};

type UserRef = { user_id: string | null };

const PAGE_LIMIT = 100;

/** Strip characters that carry meaning in a PostgREST or() filter. */
function cleanQuery(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  return v.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function AdminMembersPage(
  props: {
    searchParams?: Promise<{ q?: string | string[] }>;
  }
) {
  const searchParams = await props.searchParams;
  const q = cleanQuery(searchParams?.q);
  const admin = tryAdminClient();

  if (!admin) {
    return (
      <div className="space-y-6">
        <PageHead title="Members" />
        <AdminClientError />
      </div>
    );
  }

  let query = admin
    .from("profiles")
    .select("id, full_name, handle, role, verified_expert, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);
  if (q) query = query.or(`full_name.ilike.%${q}%,handle.ilike.%${q}%`);

  const { data, error, count } = await query;
  const members = (data ?? []) as unknown as MemberRow[];
  const ids = members.map((m) => m.id);

  const goalUsers = new Set<string>();
  const actionCounts = new Map<string, number>();

  if (ids.length > 0) {
    const [goals, actions] = await Promise.all([
      admin.from("career_goals").select("user_id").eq("status", "active").in("user_id", ids),
      admin
        .from("career_actions")
        .select("user_id")
        .eq("status", "completed")
        .gte("created_at", daysAgoIso(30))
        .in("user_id", ids)
        .limit(10000),
    ]);
    for (const g of (goals.data ?? []) as unknown as UserRef[]) {
      if (g.user_id) goalUsers.add(g.user_id);
    }
    for (const a of (actions.data ?? []) as unknown as UserRef[]) {
      if (a.user_id) actionCounts.set(a.user_id, (actionCounts.get(a.user_id) ?? 0) + 1);
    }
  }

  const total = count ?? members.length;

  return (
    <div className="space-y-6">
      <PageHead title="Members" description="Every ASCENDR profile, newest first. Read-only in this pass." />

      <form method="get" action="/app/admin/members" className="flex flex-wrap items-center gap-2">
        <label htmlFor="admin-member-search" className="sr-only">
          Search members
        </label>
        <input
          id="admin-member-search"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or handle"
          className="h-10 w-full max-w-sm rounded-full border border-border bg-white px-4 text-[14px] text-ink outline-none placeholder:text-text-secondary focus:border-brand-600"
        />
        <button type="submit" className="h-10 rounded-full bg-ink px-5 text-[13px] font-medium text-white">
          Search
        </button>
        {q ? (
          <Link href="/app/admin/members" className="px-2 text-[13px] text-text-secondary hover:text-ink">
            Clear
          </Link>
        ) : null}
      </form>

      {error ? (
        <EmptyState title="Could not load members" body={error.message} />
      ) : members.length === 0 ? (
        <EmptyState
          title={q ? "No members match that search" : "No members yet"}
          body={q ? `Nothing found for "${q}". Try a shorter name or a handle.` : undefined}
        />
      ) : (
        <>
          <p className="text-[13px] text-text-secondary">
            Showing <span className="nums font-semibold text-ink">{formatNumber(members.length)}</span> of{" "}
            <span className="nums font-semibold text-ink">{formatNumber(total)}</span>
            {q ? ` matching "${q}"` : " members"}
            {total > members.length ? ". Refine the search to narrow the list." : "."}
          </p>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Role</th>
                  <th className={TH}>Verified expert</th>
                  <th className={TH}>Joined</th>
                  <th className={TH}>Active goal</th>
                  <th className={`${TH} text-right`}>Actions, 30 days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className={TD}>
                      <p className="font-medium text-ink">{displayName(m)}</p>
                      {m.handle && m.full_name ? (
                        <p className="text-[12px] text-text-secondary">@{m.handle}</p>
                      ) : null}
                    </td>
                    <td className={TD}>
                      <Chip tone={m.role === "admin" ? "amber" : "brand"}>{m.role}</Chip>
                    </td>
                    <td className={TD}>
                      {m.verified_expert ? <Chip tone="emerald">Verified</Chip> : <span className="text-text-secondary">-</span>}
                    </td>
                    <td className={`${TD} text-text-secondary`}>{formatDate(m.created_at)}</td>
                    <td className={TD}>
                      {goalUsers.has(m.id) ? <Chip tone="emerald">Yes</Chip> : <span className="text-text-secondary">No</span>}
                    </td>
                    <td className={`${TD} nums text-right font-medium`}>{formatNumber(actionCounts.get(m.id) ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
