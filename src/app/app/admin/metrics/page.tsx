import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Activation metrics — the strategy memo's funding milestones, live.
 *
 * Reads the career_activation_metrics view (migration 0011), so the numbers
 * here and the numbers in a deck come from the same SQL and cannot drift.
 *
 * Admin only. Returns 404 rather than 403 to everyone else so the route's
 * existence is not advertised.
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
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <header>
        <p className="eyebrow text-caption text-primary">Admin</p>
        <h1 className="mt-2 font-display text-h2">Activation metrics</h1>
        <p className="mt-2 text-small text-text-secondary">
          The milestones from the strategy memo, computed live from the database. Outcomes are self-reported.
        </p>
      </header>

      {error || m === null ? (
        <p className="rounded-md border border-border bg-surface p-4 text-small text-text-secondary">
          Could not load metrics{error ? `: ${error.message}` : "."} Check that SUPABASE_SERVICE_ROLE_KEY is set in Vercel.
        </p>
      ) : (
        <>
          <p className="text-small text-text-secondary">
            Base: <span className="nums font-semibold text-text">{m.total_members}</span> members
            {m.total_members < 30 ? " — too few for the percentages to mean much yet. Quote counts, not rates." : "."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="rounded-lg border border-border bg-card p-6 shadow-card">
                <p className="text-caption font-semibold text-text-secondary">{r.label}</p>
                <p className="nums mt-2 font-display text-h1">{pct(r.n, m.total_members)}</p>
                <p className="nums text-small text-text-secondary">
                  {r.n} of {m.total_members}
                </p>
                <p className="mt-3 text-caption text-text-secondary">{r.detail}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
