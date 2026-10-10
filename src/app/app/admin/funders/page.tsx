import { tryAdminClient } from "../_lib/admin-client";
import { AdminClientError, PageHead } from "../_components/ui";
import { ANNUAL_PRICE_KES, PLAN_PRICE_KES, formatKes } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Funder metrics: the numbers investors and grant funders ask for, computed
 * live from the database. Nothing here is estimated or modelled; where a
 * number needs more data before it means anything, the page says so.
 */

const DAY = 86400000;

function pct(n: number, d: number) {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : "n/a";
}

type Sub = { plan: string; status: string; provider: string | null; current_period_end: string | null; billing_interval?: string | null };

export default async function FunderMetricsPage() {
  const admin = tryAdminClient();
  if (admin == null) {
    return (
      <div className="space-y-6">
        <PageHead title="Funder metrics" />
        <AdminClientError />
      </div>
    );
  }
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();

  const [profilesRes, goalsRes, actionsRes, outcomesRes, usageRes, subsRes, feesRes] = await Promise.all([
    admin.from("profiles").select("id, created_at").limit(100000),
    admin.from("career_goals").select("user_id").limit(100000),
    admin.from("career_actions").select("user_id, completed_at").eq("status", "completed").limit(200000),
    admin.from("career_outcomes").select("user_id, kind, verification, created_at").limit(100000),
    admin.from("usage_counters").select("user_id, count, window_start").gte("window_start", since30).limit(200000),
    admin.from("subscriptions").select("*").limit(100000),
    admin.from("placement_fees").select("amount_kes, status").limit(100000),
  ]);

  const profiles = (profilesRes.data ?? []) as { id: string; created_at: string | null }[];
  const total = profiles.length;
  const joined = new Map(profiles.map((p) => [p.id, p.created_at ? new Date(p.created_at).getTime() : null]));

  const withGoal = new Set(((goalsRes.data ?? []) as { user_id: string }[]).map((g) => g.user_id)).size;

  // 4-week retention: of members who joined 28+ days ago, how many completed
  // a career action on day 21 or later after joining.
  const cohort = profiles.filter((p) => p.created_at && now - new Date(p.created_at).getTime() >= 28 * DAY);
  const retained = new Set<string>();
  const active30 = new Set<string>();
  for (const a of (actionsRes.data ?? []) as { user_id: string; completed_at: string | null }[]) {
    if (a.completed_at == null) continue;
    const t = new Date(a.completed_at).getTime();
    const j = joined.get(a.user_id);
    if (j != null && t - j >= 21 * DAY) retained.add(a.user_id);
    if (now - t <= 30 * DAY) active30.add(a.user_id);
  }
  const retainedInCohort = cohort.filter((p) => retained.has(p.id)).length;

  const outcomes = (outcomesRes.data ?? []) as { user_id: string; kind: string; verification: string }[];
  const hires = outcomes.filter((o) => o.kind === "job_started");
  const confirmedHires = hires.filter((o) => o.verification !== "self_reported").length;
  const interviews = outcomes.filter((o) => o.kind === "interview").length;

  const usage = (usageRes.data ?? []) as { user_id: string; count: number }[];
  const aiCalls = usage.reduce((n, u) => n + (u.count ?? 0), 0);
  const aiUsers = new Set(usage.map((u) => u.user_id)).size;

  const subs = (subsRes.data ?? []) as Sub[];
  const live = subs.filter(
    (s) => ["active", "non_renewing", "past_due"].includes(s.status) && (s.current_period_end == null || new Date(s.current_period_end).getTime() > now),
  );
  const paying = live.filter((s) => s.provider !== "sponsor");
  const sponsored = live.length - paying.length;
  const mrr = paying.reduce((n, s) => {
    if (s.plan === "plus") return n + PLAN_PRICE_KES.plus;
    if (s.plan === "starter" || s.plan === "pro") {
      return n + (s.billing_interval === "annual" ? Math.round(ANNUAL_PRICE_KES[s.plan] / 12) : PLAN_PRICE_KES[s.plan]);
    }
    return n;
  }, 0);
  const fees = (feesRes.data ?? []) as { amount_kes: number; status: string }[];
  const feesCollected = fees.filter((f) => f.status === "paid").reduce((n, f) => n + f.amount_kes, 0);

  const groups: { title: string; items: { label: string; value: string; note: string }[] }[] = [
    {
      title: "Engagement",
      items: [
        { label: "Members", value: total.toLocaleString("en-US"), note: total < 30 ? "Too few for rates to mean much yet. Quote counts." : "All signed-up accounts" },
        { label: "Activation", value: pct(withGoal, total), note: `${withGoal} of ${total} set a career goal` },
        { label: "Active in last 30 days", value: pct(active30.size, total), note: `${active30.size} completed a career action` },
        { label: "4-week retention", value: pct(retainedInCohort, cohort.length), note: `${retainedInCohort} of ${cohort.length} members who joined 28+ days ago still acted after day 21` },
      ],
    },
    {
      title: "Outcomes",
      items: [
        { label: "Hires per 100 members", value: total > 0 ? ((hires.length / total) * 100).toFixed(1) : "n/a", note: `${hires.length} hires logged, ${confirmedHires} confirmed by a partner` },
        { label: "Interviews logged", value: String(interviews), note: "Self-reported and partner-confirmed" },
      ],
    },
    {
      title: "Revenue",
      items: [
        { label: "Monthly recurring revenue", value: formatKes(mrr), note: `${paying.length} paying plans; yearly plans counted at 1/12` },
        { label: "Sponsored seats active", value: String(sponsored), note: "Plus unlocked with a sponsor code" },
        { label: "Hire fees collected", value: formatKes(feesCollected), note: `${fees.length} hire fees recorded in total` },
      ],
    },
    {
      title: "AI usage",
      items: [
        { label: "AI requests, last 30 days", value: aiCalls.toLocaleString("en-US"), note: `${aiUsers} members used AI features` },
        { label: "AI requests per AI user", value: aiUsers > 0 ? (aiCalls / aiUsers).toFixed(1) : "n/a", note: "Multiply by your average cost per request from the OpenAI dashboard for cost per member" },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <PageHead title="Funder metrics" description="The numbers investors and grant funders ask for, computed live. Nothing here is estimated." />
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{g.title}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {g.items.map((k) => (
              <div key={k.label} className="rounded-2xl border border-border bg-white p-5 shadow-card">
                <p className="text-[12px] text-text-secondary">{k.label}</p>
                <p className="nums mt-1 text-[24px] font-semibold tracking-tight text-ink">{k.value}</p>
                <p className="mt-2 border-t border-border pt-2 text-[12px] leading-snug text-text-secondary">{k.note}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
