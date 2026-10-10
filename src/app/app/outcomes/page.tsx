import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { OUTCOME_KINDS, outcomeLabel } from "@/lib/career/outcomes";
import { recordOutcome, deleteOutcome } from "@/app/app/career/actions";

export const dynamic = "force-dynamic";

/**
 * Outcomes ledger (PRD section 10). The evidence behind the 90-day outcome
 * metric: every win the member logs, how it was verified, and progress over
 * the last six months (career actions vs outcomes).
 *
 * Honesty: everything a member logs is self_reported. The page shows the
 * verification split explicitly so a number quoted from here is never
 * presented as confirmed when it is not.
 */

type Outcome = {
  id: string;
  kind: string;
  title: string | null;
  organization: string | null;
  occurred_on: string;
  verification: string;
};

const VERIFICATION: Record<string, { label: string; tone: string }> = {
  self_reported: { label: "Self-reported", tone: "bg-surface text-text-secondary" },
  partner_confirmed: { label: "Partner-confirmed", tone: "bg-emerald-50 text-emerald-800" },
  document_verified: { label: "Document-verified", tone: "bg-brand-50 text-brand-700" },
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function OutcomesPage({ searchParams }: { searchParams: { kind?: string } }) {
  const profile = await getCurrentProfile();
  const me = profile?.id ?? "";
  const supabase = createClient();
  const filter = (searchParams.kind ?? "").trim();

  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);

  const [{ data: outRows }, { data: actRows }, { data: goal }] = await Promise.all([
    supabase
      .from("career_outcomes")
      .select("id, kind, title, organization, occurred_on, verification")
      .eq("user_id", me)
      .order("occurred_on", { ascending: false })
      .limit(200),
    supabase
      .from("career_actions")
      .select("completed_at")
      .eq("user_id", me)
      .eq("status", "completed")
      .gte("completed_at", since.toISOString())
      .limit(2000),
    supabase.from("career_goals").select("id").eq("user_id", me).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const outcomes = (outRows ?? []) as Outcome[];
  const shown = filter ? outcomes.filter((o) => o.kind === filter) : outcomes;
  const today = new Date().toISOString().slice(0, 10);

  // Six monthly buckets.
  const months: { key: string; label: string; actions: number; wins: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    months.push({ key: monthKey(d), label: d.toLocaleDateString(undefined, { month: "short" }), actions: 0, wins: 0 });
  }
  const idx = new Map(months.map((m, i) => [m.key, i]));
  (actRows ?? []).forEach((r: { completed_at: string | null }) => {
    if (r.completed_at == null) return;
    const i = idx.get(monthKey(new Date(r.completed_at)));
    if (i !== undefined) months[i].actions += 1;
  });
  outcomes.forEach((o) => {
    const i = idx.get(monthKey(new Date(o.occurred_on)));
    if (i !== undefined) months[i].wins += 1;
  });
  const maxActions = Math.max(4, ...months.map((m) => m.actions));
  const maxWins = Math.max(2, ...months.map((m) => m.wins));

  const count = (k: string[]) => outcomes.filter((o) => k.includes(o.kind)).length;
  const confirmed = outcomes.filter((o) => o.verification !== "self_reported").length;
  const kindsPresent = OUTCOME_KINDS.filter((k) => outcomes.some((o) => o.kind === k.value));

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Outcomes ledger</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            What your work has <span className="accent-serif">led to.</span>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">Interviews, offers, promotions and introductions. Outcomes, not activity.</p>
        </div>
        <a href="#log" className="w-fit rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
          Log a win
        </a>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Wins logged", value: outcomes.length, note: `${confirmed} confirmed by a partner or document` },
          { label: "Interviews", value: count(["interview"]), note: "the first sign of fit" },
          { label: "Offers and new jobs", value: count(["offer", "job_started", "promotion", "raise"]), note: "offers, starts, promotions, raises" },
          { label: "Introductions", value: count(["introduction_made"]), note: "warm paths that happened" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[13px] text-text-secondary">{m.label}</p>
            <p className="nums mt-2 text-[30px] font-semibold leading-none tracking-tight text-ink">{m.value}</p>
            <p className="mt-2 text-[12px] text-text-secondary">{m.note}</p>
          </div>
        ))}
      </div>

      {/* Progress over time */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Progress over time</h2>
            <p className="text-[13px] text-text-secondary">Career actions completed and wins logged, last six months.</p>
          </div>
          <div className="flex gap-4 text-[12px] text-text-secondary">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-lg bg-ink/20" />Career actions</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" />Wins</span>
          </div>
        </div>
        <div className="mt-6 grid h-52 grid-cols-6 items-end gap-3 border-b border-border pb-0">
          {months.map((m) => (
            <div key={m.key} className="relative flex h-full flex-col items-center justify-end">
              <span className="nums mb-1 text-[11px] text-text-secondary">{m.actions || ""}</span>
              <div className="w-full max-w-[56px] rounded-t-lg bg-ink/15" style={{ height: `${(m.actions / maxActions) * 85}%` }} />
              {m.wins > 0 && (
                <span
                  className="nums absolute left-1/2 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white"
                  style={{ bottom: `${Math.min(88, (m.wins / maxWins) * 70 + 8)}%` }}
                  title={`${m.wins} wins`}
                >
                  {m.wins}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-6 gap-3 text-center text-[12px] text-text-secondary">
          {months.map((m) => (
            <span key={m.key}>{m.label}</span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Ledger */}
        <section className="rounded-2xl border border-border bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-4">
            <h2 className="mr-auto text-[16px] font-semibold text-ink">Ledger</h2>
            <Link href="/app/outcomes" className={`rounded-full px-3 py-1 text-[12px] font-medium ${filter ? "text-text-secondary hover:text-ink" : "bg-ink text-white"}`}>
              All
            </Link>
            {kindsPresent.map((k) => (
              <Link
                key={k.value}
                href={`/app/outcomes?kind=${k.value}`}
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${filter === k.value ? "bg-ink text-white" : "text-text-secondary hover:text-ink"}`}
              >
                {k.label.replace(/^(Got an?|Received an?|Started a|Earned a|Won a|Raised|Got)\s/, "")}
              </Link>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[15px] font-medium text-ink">{outcomes.length ? "Nothing of this type yet" : "No wins logged yet"}</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-text-secondary">
                Got an interview, an intro or an offer? Log it. Outcomes are how ASCENDR learns what actually moves careers.
              </p>
            </div>
          ) : (
            <ol className="relative px-6 py-4">
              <span aria-hidden className="absolute bottom-6 left-[31px] top-6 w-px bg-border" />
              {shown.map((o) => {
                const v = VERIFICATION[o.verification] ?? VERIFICATION.self_reported;
                return (
                  <li key={o.id} className="relative flex items-start gap-4 py-3">
                    <span className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white bg-accent ring-1 ring-accent/30" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink">{outcomeLabel(o.kind)}</p>
                      <p className="text-[13px] text-text-secondary">
                        {[o.title, o.organization].filter(Boolean).join(" \u00b7 ") || "No details"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${v.tone}`}>{v.label}</span>
                        <span className="text-[12px] text-text-secondary">
                          {new Date(o.occurred_on).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <form action={deleteOutcome}>
                      <input type="hidden" name="outcome_id" value={o.id} />
                      <button className="text-[12px] text-text-secondary hover:text-danger">Remove</button>
                    </form>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Log form */}
        <section id="log" className="scroll-mt-24 rounded-2xl border border-border bg-white p-6 shadow-card">
          <h2 className="text-[16px] font-semibold text-ink">Log a win</h2>
          <p className="mt-1 text-[13px] text-text-secondary">Saved as self-reported. Partners can confirm it later.</p>
          <form action={recordOutcome} className="mt-5 space-y-3">
            <input type="hidden" name="goal_id" value={goal?.id ?? ""} />
            <label className="block text-[12px] font-medium text-text-secondary">
              What happened?
              <select name="kind" required className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-ink">
                {OUTCOME_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] font-medium text-text-secondary">
              Role or detail
              <input name="title" maxLength={200} placeholder="e.g. Associate Product Manager" className="mt-1 block w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink" />
            </label>
            <label className="block text-[12px] font-medium text-text-secondary">
              Organisation
              <input name="organization" maxLength={200} placeholder="e.g. Ledgerly" className="mt-1 block w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink" />
            </label>
            <label className="block text-[12px] font-medium text-text-secondary">
              When
              <input type="date" name="occurred_on" max={today} defaultValue={today} className="mt-1 block w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink" />
            </label>
            <button className="w-full rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-white hover:bg-ink-700">Save win</button>
          </form>
        </section>
      </div>
    </div>
  );
}
