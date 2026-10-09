import Link from "next/link";
import { daysAgoDate, daysAgoIso, tryAdminClient } from "./_lib/admin-client";
import {
  AdminClientError,
  Card,
  Chip,
  EmptyState,
  Kpi,
  MigrationNotice,
  PageHead,
  SectionTitle,
  displayName,
  formatDate,
  formatNumber,
  orgKindLabel,
} from "./_components/ui";

export const dynamic = "force-dynamic";

/**
 * Platform admin overview. Cross-user counts need the service-role client
 * (RLS scopes every career table to its owner). Gating lives in layout.tsx.
 */

type MemberRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  role: string;
  verified_expert: boolean | null;
  created_at: string | null;
};

type OrgRow = { id: string; name: string; kind: string | null; created_at: string | null };

export default async function AdminOverviewPage() {
  const admin = tryAdminClient();
  if (!admin) {
    return (
      <div className="space-y-6">
        <PageHead title="Overview" />
        <AdminClientError />
      </div>
    );
  }

  const [members, goals, actions, outcomes, orgs, communities, newestMembers, newestOrgs] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("career_goals").select("user_id").eq("status", "active").limit(10000),
    admin
      .from("career_actions")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", daysAgoIso(7)),
    admin.from("career_outcomes").select("id", { count: "exact", head: true }).gte("occurred_on", daysAgoDate(90)),
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin.from("communities").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id, full_name, handle, role, verified_expert, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    admin.from("organizations").select("id, name, kind, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  const goalUsers = new Set(
    ((goals.data ?? []) as { user_id: string | null }[]).map((g) => g.user_id).filter(Boolean)
  );
  const orgsMissing = Boolean(orgs.error) || Boolean(newestOrgs.error);

  const memberList = (newestMembers.data ?? []) as unknown as MemberRow[];
  const orgList = (newestOrgs.data ?? []) as unknown as OrgRow[];

  const kpis = [
    { label: "Total members", value: members.error ? "-" : formatNumber(members.count ?? 0) },
    { label: "Members with an active goal", value: goals.error ? "-" : formatNumber(goalUsers.size) },
    { label: "Career actions, last 7 days", value: actions.error ? "-" : formatNumber(actions.count ?? 0) },
    { label: "Outcomes, last 90 days", value: outcomes.error ? "-" : formatNumber(outcomes.count ?? 0) },
    {
      label: "Organisations",
      value: orgsMissing ? "-" : formatNumber(orgs.count ?? 0),
      hint: orgsMissing ? "Run migration 0013" : undefined,
    },
    { label: "Communities", value: communities.error ? "-" : formatNumber(communities.count ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <PageHead
        title="Overview"
        description="Platform-wide health across members, career activity, organisations and communities."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Kpi key={k.label} label={k.label} value={k.value} hint={k.hint} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle
            aside={
              <Link href="/app/admin/members" className="font-medium text-brand-600 hover:text-brand-700">
                All members
              </Link>
            }
          >
            Newest members
          </SectionTitle>
          {newestMembers.error ? (
            <EmptyState title="Could not load members" body={newestMembers.error.message} />
          ) : memberList.length === 0 ? (
            <EmptyState title="No members yet" />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-border">
                {memberList.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{displayName(m)}</p>
                      <p className="text-[12px] text-text-secondary">Joined {formatDate(m.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {m.verified_expert ? <Chip tone="emerald">Verified</Chip> : null}
                      <Chip tone={m.role === "admin" ? "amber" : "brand"}>{m.role}</Chip>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section>
          <SectionTitle
            aside={
              <Link href="/app/admin/networks" className="font-medium text-brand-600 hover:text-brand-700">
                All organisations
              </Link>
            }
          >
            Newest organisations
          </SectionTitle>
          {orgsMissing ? (
            <MigrationNotice />
          ) : orgList.length === 0 ? (
            <EmptyState title="No organisations yet" body="Organisations appear here once someone creates a network." />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-border">
                {orgList.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{o.name}</p>
                      <p className="text-[12px] text-text-secondary">Created {formatDate(o.created_at)}</p>
                    </div>
                    <Chip tone="brand">{orgKindLabel(o.kind)}</Chip>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
