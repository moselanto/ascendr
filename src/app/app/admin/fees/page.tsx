import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { formatKes } from "@/lib/billing";
import { tryAdminClient, one } from "../_lib/admin-client";
import { AdminClientError, PageHead } from "../_components/ui";

export const dynamic = "force-dynamic";

/**
 * Placement (hire) fees, migration 0022. A row appears when a network marks
 * a consented introduction as hired. Staff invoice the hiring company and
 * move the fee through due, invoiced, paid or waived.
 */

const STATUSES = ["due", "invoiced", "paid", "waived"] as const;
type Status = (typeof STATUSES)[number];
const TONE: Record<Status, string> = {
  due: "bg-amber-50 text-amber-800",
  invoiced: "bg-brand-50 text-brand-700",
  paid: "bg-emerald-50 text-emerald-800",
  waived: "bg-surface text-text-secondary",
};

async function setFeeStatus(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  if (id.length === 0 || STATUSES.includes(status) === false) return;
  const admin = tryAdminClient();
  if (admin == null) return;
  await admin.from("placement_fees").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/app/admin/fees");
}

type Fee = {
  id: string;
  company: string;
  role_title: string | null;
  amount_kes: number;
  network_share_kes: number;
  status: Status;
  created_at: string;
  organizations: unknown;
  profiles: unknown;
};

export default async function AdminFeesPage() {
  const admin = tryAdminClient();
  if (admin == null) {
    return (
      <div className="space-y-6">
        <PageHead title="Hire fees" />
        <AdminClientError />
      </div>
    );
  }
  const { data, error } = await admin
    .from("placement_fees")
    .select("id, company, role_title, amount_kes, network_share_kes, status, created_at, organizations:organization_id(name), profiles:member_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  const fees = (data ?? []) as Fee[];
  const sum = (s: Status[]) => fees.filter((f) => s.includes(f.status)).reduce((n, f) => n + f.amount_kes, 0);
  const owedToNetworks = fees.filter((f) => f.status === "paid").reduce((n, f) => n + f.network_share_kes, 0);

  return (
    <div className="space-y-6">
      <PageHead title="Hire fees" />
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[13px] text-amber-900">
          Run <code className="rounded bg-white/70 px-1.5 py-0.5">supabase/migrations/0022_plus_and_placement_fees.sql</code> in Supabase to enable hire fees.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Due or invoiced", value: formatKes(sum(["due", "invoiced"])) },
          { label: "Collected", value: formatKes(sum(["paid"])) },
          { label: "Network shares on collected fees", value: formatKes(owedToNetworks) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[12px] text-text-secondary">{s.label}</p>
            <p className="nums mt-1 text-[24px] font-semibold tracking-tight text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        {fees.length === 0 ? (
          <p className="px-6 py-10 text-center text-[14px] text-text-secondary">No hires recorded yet. A fee appears here when a network marks an introduction as hired.</p>
        ) : (
          <ul className="divide-y divide-border">
            {fees.map((f) => {
              const org = one(f.organizations as { name: string } | { name: string }[] | null);
              const member = one(f.profiles as { full_name: string | null } | { full_name: string | null }[] | null);
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink">
                      {f.company}
                      {f.role_title ? <span className="font-normal text-text-secondary"> · {f.role_title}</span> : null}
                    </p>
                    <p className="text-[12px] text-text-secondary">
                      {member?.full_name ?? "Member"} via {org?.name ?? "network"} ·{" "}
                      {new Date(f.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="nums text-[14px] font-semibold text-ink">{formatKes(f.amount_kes)}</p>
                    <p className="nums text-[12px] text-text-secondary">Network share {formatKes(f.network_share_kes)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium capitalize ${TONE[f.status]}`}>{f.status}</span>
                  <form action={setFeeStatus} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={f.id} />
                    <select name="status" defaultValue={f.status} className="rounded-lg border border-border bg-white px-2 py-1.5 text-[13px] text-ink">
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-full border border-ink/15 px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40">Save</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
