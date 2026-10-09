import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, EmptyState, PageHead } from "../_components/ui";

export const dynamic = "force-dynamic";

/**
 * Activation metrics — the strategy memo's funding milestones, live.
 *
 * Reads the career_activation_metrics view (migration 0011), so the numbers
 * here and the numbers in a deck come from the same SQL and cannot drift.
 *
 * Admin only. Returns 404 rather than 403 to everyone else so the route's
 * existence is not advertised. (The /app/admin layout gates too; this check
 * is kept as defence in depth.)
 */

type Metrics = {
  total_members: number;
  with_goal: number;
  network_activated: number;
  acted_within_7d: number;
  outcome_within_90d: number;
};

function pct(n: number, d: number) {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : "—";
}

export default async function MetricsPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const admin = createAdminClient();
  const { data, error } = await admin.from("career_activation_metrics").select("*").maybeSingle();
  const m = (data ?? null) as Metrics | null;

  const rows = m
    ? [
        { label: "Career activation", detail: "Members who set a career goal", n: m.with_goal },
        { label: "Network activation", detail: "Contacted a mentor, joined a community or requested an intro", n: m.network_activated },
        { label: "Acted within 7 days", detail: "Completed any career action in their first week", n: m.acted_within_7d },
        { label: "Outcome within 90 days", detail: "Recorded an interview, offer, job, promotion or similar", n: m.outcome_within_90d },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHead
        title="Activation metrics"
        description="The milestones from the strategy memo, computed live from the database. Outcomes are self-reported."
      />

      {error || m === null ? (
        <EmptyState
          title="Could not load metrics"
          body={`${error ? `${error.message}. ` : ""}Check that SUPABASE_SERVICE_ROLE_KEY is set in Vercel.`}
        />
      ) : (
        <>
          <Card>
            <p className="text-[13px] text-text-secondary">Base cohort</p>
            <p className="nums mt-2 text-[28px] font-semibold leading-none text-ink">{m.total_members}</p>
            <p className="mt-2 text-[13px] text-text-secondary">
              members
              {m.total_members < 30 ? " — too few for the percentages to mean much yet. Quote counts, not rates." : "."}
            </p>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((r) => (
              <Card key={r.label}>
                <p className="text-[13px] text-text-secondary">{r.label}</p>
                <p className="nums mt-2 text-[28px] font-semibold leading-none text-ink">{pct(r.n, m.total_members)}</p>
                <p className="nums mt-1.5 text-[13px] text-text-secondary">
                  {r.n} of {m.total_members}
                </p>
                <p className="mt-3 border-t border-border pt-3 text-[12px] text-text-secondary">{r.detail}</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
