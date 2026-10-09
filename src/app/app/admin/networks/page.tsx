import { tryAdminClient } from "../_lib/admin-client";
import {
  AdminClientError,
  Card,
  Chip,
  EmptyState,
  MigrationNotice,
  PageHead,
  TD,
  TH,
  formatDate,
  formatNumber,
  orgKindLabel,
} from "../_components/ui";

export const dynamic = "force-dynamic";

/** Read-only list of every organisation (ASCENDR Networks, migration 0013). */

type OrgRow = { id: string; name: string; kind: string | null; created_at: string | null };

export default async function AdminNetworksPage() {
  const admin = tryAdminClient();
  if (!admin) {
    return (
      <div className="space-y-6">
        <PageHead title="Networks" />
        <AdminClientError />
      </div>
    );
  }

  const [orgs, members, roles] = await Promise.all([
    admin.from("organizations").select("id, name, kind, created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("organization_members").select("organization_id").limit(50000),
    admin.from("organization_roles").select("organization_id").limit(50000),
  ]);

  const missing = Boolean(orgs.error) || Boolean(members.error) || Boolean(roles.error);

  const memberCounts = new Map<string, number>();
  for (const r of (members.data ?? []) as { organization_id: string }[]) {
    memberCounts.set(r.organization_id, (memberCounts.get(r.organization_id) ?? 0) + 1);
  }
  const roleCounts = new Map<string, number>();
  for (const r of (roles.data ?? []) as { organization_id: string }[]) {
    roleCounts.set(r.organization_id, (roleCounts.get(r.organization_id) ?? 0) + 1);
  }

  const list = (orgs.data ?? []) as unknown as OrgRow[];

  return (
    <div className="space-y-6">
      <PageHead
        title="Networks"
        description="Organisations using ASCENDR Networks: funds, accelerators, universities, associations and companies."
      />

      {missing ? (
        <MigrationNotice />
      ) : list.length === 0 ? (
        <EmptyState title="No organisations yet" body="Organisations appear here once someone creates a network." />
      ) : (
        <>
          <p className="text-[13px] text-text-secondary">
            <span className="nums font-semibold text-ink">{formatNumber(list.length)}</span> organisations
          </p>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Organisation</th>
                  <th className={TH}>Kind</th>
                  <th className={`${TH} text-right`}>Members</th>
                  <th className={`${TH} text-right`}>Open roles</th>
                  <th className={TH}>Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((o) => (
                  <tr key={o.id}>
                    <td className={`${TD} font-medium`}>{o.name}</td>
                    <td className={TD}>
                      <Chip tone="brand">{orgKindLabel(o.kind)}</Chip>
                    </td>
                    <td className={`${TD} nums text-right`}>{formatNumber(memberCounts.get(o.id) ?? 0)}</td>
                    <td className={`${TD} nums text-right`}>{formatNumber(roleCounts.get(o.id) ?? 0)}</td>
                    <td className={`${TD} text-text-secondary`}>{formatDate(o.created_at)}</td>
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
