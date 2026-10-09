import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { analyzeGap, type GapAnalysis } from "@/lib/career/gap";
import { findOpportunities, type Opportunity } from "@/lib/opportunities";
import { initials } from "@/lib/people";
import { saveOpportunity, moveOpportunity, removeOpportunity } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Opportunity intelligence (PRD section 4.3): never a plain job board.
 * Every role shows the member's fit band and what is missing, a warm path
 * where one exists, and can be tracked through Saved -> Applied ->
 * Interviewing -> Offer.
 *
 * Honesty: feeds match on job title only, so fit is the member's band for
 * the role type, stated once and explained. Warm paths are only people whose
 * own profile text mentions the company, never inferred employers or
 * "mutual connections" (PRD section 6).
 */

type Saved = {
  id: string;
  external_id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  status: "saved" | "applied" | "interviewing" | "offer" | "closed";
  updated_at: string;
};

const STAGES: { key: Saved["status"]; label: string; tone: string }[] = [
  { key: "saved", label: "Saved", tone: "bg-surface text-text-secondary" },
  { key: "applied", label: "Applied", tone: "bg-brand-50 text-brand-700" },
  { key: "interviewing", label: "Interviewing", tone: "bg-amber-50 text-amber-800" },
  { key: "offer", label: "Offer", tone: "bg-emerald-50 text-emerald-800" },
];

const BAND: Record<GapAnalysis["band"], { label: string; chip: string; line: string }> = {
  strong: { label: "Strong fit", chip: "border-emerald-200 bg-emerald-50 text-emerald-800", line: "You cover most core skills for this role type. Apply." },
  partial: { label: "Partial fit", chip: "border-amber-200 bg-amber-50 text-amber-800", line: "Within reach. Close the top gap while you apply." },
  stretch: { label: "Stretch", chip: "border-brand-200 bg-brand-50 text-brand-700", line: "A real move. Use these to learn what employers ask for." },
  unknown: { label: "Not analysed", chip: "border-border bg-surface text-text-secondary", line: "Set a supported goal to see your fit." },
};

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

export default async function OpportunitiesPage() {
  const profile = await getCurrentProfile();
  const me = profile?.id ?? "";
  const supabase = createClient();

  const { data: goal } = await supabase
    .from("career_goals")
    .select("id, target_title")
    .eq("user_id", me)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const analysis = goal ? await analyzeGap(me, goal.id) : null;
  const roleTitle = analysis?.roleTitle ?? goal?.target_title ?? null;
  const band = BAND[analysis?.band ?? "unknown"];
  const topGap = (analysis?.gaps ?? []).find((g) => g.importance === "essential")?.label ?? null;

  let jobs: Opportunity[] = [];
  let total = 0;
  let companies = 0;
  if (analysis?.roleId && roleTitle) {
    try {
      const res = await findOpportunities(roleTitle, 12);
      jobs = res.jobs;
      total = res.total;
      companies = res.companies;
    } catch {
      jobs = [];
    }
  }

  const savedRes = await supabase
    .from("saved_opportunities")
    .select("id, external_id, title, company, location, url, status, updated_at")
    .eq("user_id", me)
    .order("updated_at", { ascending: false });
  const trackerReady = savedRes.error == null;
  const saved = ((savedRes.data ?? []) as Saved[]).filter((s) => s.status !== "closed");
  const savedIds = new Set(saved.map((s) => s.external_id));

  // Warm paths: people whose own profile text mentions the company.
  const companyNames = Array.from(new Set([...jobs.map((j) => j.company), ...saved.map((s) => s.company)])).slice(0, 10);
  const warm = new Map<string, { id: string; full_name: string | null }[]>();
  if (companyNames.length) {
    const orFilter = companyNames.map((c) => `bio.ilike.%${c.replace(/[,()%]/g, "")}%`).join(",");
    const { data: ppl } = await supabase.from("profiles").select("id, full_name, bio").neq("id", me).or(orFilter).limit(40);
    (ppl ?? []).forEach((p: { id: string; full_name: string | null; bio: string | null }) => {
      companyNames.forEach((c) => {
        if ((p.bio ?? "").toLowerCase().includes(c.toLowerCase())) {
          const l = warm.get(c) ?? [];
          if (l.length < 3) l.push({ id: p.id, full_name: p.full_name });
          warm.set(c, l);
        }
      });
    });
  }

  const counts = Object.fromEntries(STAGES.map((s) => [s.key, saved.filter((x) => x.status === s.key).length])) as Record<string, number>;

  return (
    <div className="space-y-8 pb-16">
      {/* Head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Opportunities</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            {roleTitle ? (
              <>
                Roles for your move to <span className="accent-serif">{roleTitle}</span>
              </>
            ) : (
              "Roles worth your time"
            )}
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">Every role shows your fit, what is missing, and who might know the company.</p>
        </div>
      </div>

      {/* Tracker summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAGES.map((s) => (
          <div key={s.key} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="nums text-[30px] font-semibold leading-none tracking-tight text-ink">{counts[s.key] ?? 0}</p>
            <p className="mt-2 text-[13px] text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {trackerReady === false && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[14px] text-amber-900">
          The tracker needs one database update. Run <code className="rounded bg-white/70 px-1.5 py-0.5">supabase/migrations/0012_saved_opportunities.sql</code> in
          the Supabase SQL editor, then refresh.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Recommended */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">Recommended for your goal</h2>
            {total > 0 && (
              <p className="text-[12px] text-text-secondary">
                {total} live across {companies} {companies === 1 ? "company" : "companies"}
              </p>
            )}
          </div>

          {roleTitle && analysis?.roleId && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-card">
              <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${band.chip}`}>{band.label}</span>
              <p className="flex-1 text-[13px] text-text-secondary">
                {band.line}
                {topGap ? ` Top gap: ${topGap}.` : ""}
              </p>
              {topGap && (
                <Link href="/app/career#roadmap" className="text-[13px] font-medium text-ink hover:underline">
                  Close this gap \u2192
                </Link>
              )}
            </div>
          )}

          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
              <p className="text-[15px] font-medium text-ink">{analysis?.roleId ? "No open roles right now" : "Set a goal to see matched roles"}</p>
              <p className="mt-1 text-[13px] text-text-secondary">
                {analysis?.roleId ? "We check company job boards every hour." : "Roles are matched to a supported target role."}
              </p>
              {analysis?.roleId ? null : (
                <Link href="/onboarding" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white">
                  Set my goal
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {jobs.map((j) => {
                const paths = warm.get(j.company) ?? [];
                const isSaved = savedIds.has(j.id);
                return (
                  <li key={j.id} className="rounded-2xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-lift">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-[14px] font-semibold text-ink">
                        {j.company.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={j.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-ink hover:underline">
                            {j.title}
                          </a>
                          {j.seniority === "senior" && <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary">Senior</span>}
                        </div>
                        <p className="text-[13px] text-text-secondary">
                          {j.company}
                          {j.location ? ` \u00b7 ${j.location}` : ""}
                          {j.remote ? " \u00b7 Remote" : ""}
                        </p>
                        {paths.length > 0 && (
                          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-ink/80">
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">Warm path</span>
                            {paths.map((p, i) => (
                              <span key={p.id}>
                                <Link href={`/app/members/${p.id}`} className="font-medium hover:underline">
                                  {p.full_name ?? "A member"}
                                </Link>
                                {i < paths.length - 1 ? "," : ""}
                              </span>
                            ))}
                            <span className="text-text-secondary">mentions {j.company} in their profile</span>
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {isSaved ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-medium text-emerald-800">Saved</span>
                        ) : trackerReady ? (
                          <form action={saveOpportunity}>
                            <input type="hidden" name="external_id" value={j.id} />
                            <input type="hidden" name="title" value={j.title} />
                            <input type="hidden" name="company" value={j.company} />
                            <input type="hidden" name="location" value={j.location ?? ""} />
                            <input type="hidden" name="url" value={j.url} />
                            <input type="hidden" name="source" value={j.source} />
                            <button className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-ink-700">Save</button>
                          </form>
                        ) : null}
                        <a href={j.url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-text-secondary hover:text-ink">
                          View role \u2197
                        </a>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Tracker */}
        <section>
          <h2 className="mb-3 text-[17px] font-semibold tracking-tight text-ink">Your tracker</h2>
          {saved.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
              <p className="text-[15px] font-medium text-ink">Nothing tracked yet</p>
              <p className="mt-1 text-[13px] text-text-secondary">Save a role and move it through applied, interviewing and offer. Applying counts as a career action.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {STAGES.filter((s) => (counts[s.key] ?? 0) > 0).map((stage) => (
                <div key={stage.key} className="rounded-2xl border border-border bg-white shadow-card">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${stage.tone}`}>{stage.label}</span>
                    <span className="nums text-[12px] text-text-secondary">{counts[stage.key]}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {saved
                      .filter((s) => s.status === stage.key)
                      .map((s) => (
                        <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">
                            {initials(s.company)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-ink">{s.title}</p>
                            <p className="truncate text-[12px] text-text-secondary">
                              {s.company} \u00b7 updated {daysAgo(s.updated_at)}
                            </p>
                          </div>
                          <form action={moveOpportunity} className="flex items-center gap-1.5">
                            <input type="hidden" name="id" value={s.id} />
                            <select
                              name="status"
                              defaultValue={s.status}
                              aria-label="Stage"
                              className="rounded-lg border border-border bg-white px-2 py-1 text-[12px] text-ink"
                            >
                              {STAGES.map((st) => (
                                <option key={st.key} value={st.key}>
                                  {st.label}
                                </option>
                              ))}
                              <option value="closed">Closed</option>
                            </select>
                            <button className="rounded-lg border border-ink/15 px-2 py-1 text-[12px] font-medium text-ink hover:border-ink/40">Move</button>
                          </form>
                          <form action={removeOpportunity}>
                            <input type="hidden" name="id" value={s.id} />
                            <button aria-label={`Remove ${s.title}`} className="px-1 text-[14px] text-text-secondary hover:text-danger">
                              \u00d7
                            </button>
                          </form>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
              {counts.interviewing > 0 && (
                <Link href="/app/career" className="block rounded-2xl bg-ink px-5 py-4 text-[14px] text-white hover:bg-ink-700">
                  Interviewing? Log it as a win so it counts as an outcome \u2192
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
