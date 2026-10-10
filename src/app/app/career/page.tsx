import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { analyzeGap, explainMatch, type GapAnalysis } from "@/lib/career/gap";
import { trackAsync } from "@/lib/analytics";
import { markSkillHeld, unmarkSkillHeld, recordOutcome, deleteOutcome } from "./actions";
import { OUTCOME_KINDS, outcomeLabel } from "@/lib/career/outcomes";
import { findOpportunities } from "@/lib/opportunities";
import { buildRoadmap } from "@/lib/career/roadmap";
import { Roadmap } from "@/components/app/Roadmap";

export const dynamic = "force-dynamic";

/**
 * Career Intelligence — the vertical slice from the strategy memo:
 * goal → gaps → roadmap → mentors → communities → opportunities.
 *
 * Honesty rules this page follows:
 *   - Gaps are computed (lib/career/gap.ts), never generated.
 *   - Fit is a band, never a percentage.
 *   - Recommendations say WHY they appear; where there is no real signal
 *     (e.g. mentor matching before mentors declare skills) the page says so
 *     instead of implying a match.
 */

const BAND_COPY: Record<GapAnalysis["band"], { label: string; tone: string; line: string }> = {
  strong: { label: "Strong fit", tone: "bg-emerald-50 text-emerald-800 border-emerald-200", line: "You already cover most of the core skills for this role." },
  partial: { label: "Partial fit", tone: "bg-amber-50 text-amber-800 border-amber-200", line: "You cover a meaningful share of the core skills. The gaps below are your plan." },
  stretch: { label: "Stretch goal", tone: "bg-brand-50 text-brand-700 border-brand-200", line: "This is a real move. Start with the first few core skills below." },
  unknown: { label: "Not analysed yet", tone: "bg-surface text-text-secondary border-border", line: "We can't compare your skills to this role yet." },
};

const STOPWORDS = new Set(["and", "the", "of", "a", "an", "for", "to", "in", "manager", "specialist"]);

async function resolveTargetRole(goal: { id: string; target_role_id: string | null; target_title: string | null }) {
  if (goal.target_role_id || !goal.target_title) return goal.target_role_id;
  const supabase = createClient();
  const { data: roles } = await supabase.from("role_profiles").select("id, title, alt_titles");
  const want = goal.target_title.trim().toLowerCase();
  const hit = (roles ?? []).find(
    (r) => r.title.toLowerCase() === want || (r.alt_titles ?? []).some((a: string) => a.toLowerCase() === want)
  );
  if (!hit) return null;
  await supabase.from("career_goals").update({ target_role_id: hit.id }).eq("id", goal.id);
  return hit.id as string;
}

export default async function CareerPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = createClient();

  const { data: goal } = await supabase
    .from("career_goals")
    .select("id, kind, target_title, target_role_id, horizon_months")
    .eq("user_id", profile!.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!goal) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-display text-[28px] font-semibold tracking-tight">Set a career goal to start</h1>
        <p className="mt-4 text-body text-text-secondary">
          Career Intelligence compares where you are with where you want to go. It needs a destination first.
        </p>
        <Link href="/onboarding" className="mt-8 inline-flex rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white hover:bg-ink-700">
          Set my goal
        </Link>
      </div>
    );
  }

  await resolveTargetRole(goal);
  const analysis = await analyzeGap(profile!.id, goal.id);
  trackAsync("gap_analysis_viewed", {
    userId: profile!.id,
    props: { band: analysis?.band ?? "none", gap_count: analysis?.gaps.length ?? 0 },
  });

  const roleTitle = analysis?.roleTitle ?? goal.target_title ?? "your target role";
  const band = BAND_COPY[analysis?.band ?? "unknown"];
  const essentialGaps = (analysis?.gaps ?? []).filter((g) => g.importance === "essential");
  // Completed roadmap steps for this goal (career_actions, related_type = plan_step).
  const { data: stepRows } = await supabase
    .from("career_actions")
    .select("detail")
    .eq("user_id", profile?.id ?? "")
    .eq("related_type", "plan_step")
    .eq("goal_id", goal.id);
  const completedSteps = new Set((stepRows ?? []).map((r: { detail: string | null }) => r.detail ?? ""));
  const roadmap = buildRoadmap(essentialGaps, completedSteps);
  const heldIds = new Set((analysis?.held ?? []).map((h) => h.skillId));

  // Communities: keyword overlap with the target role, then size. Labelled
  // with the reason, or honestly as "popular" when there is no overlap.
  const keywords: string[] = String(roleTitle).toLowerCase().split(/\W+/).filter((w: string) => w.length > 2 && !STOPWORDS.has(w));
  const { data: communities } = await supabase
    .from("communities")
    .select("id, slug, name, description, member_count")
    .eq("visibility", "public")
    .order("member_count", { ascending: false })
    .limit(30);
  const rankedCommunities = (communities ?? [])
    .map((c) => {
      const text = `${c.name} ${c.description ?? ""}`.toLowerCase();
      const hits = keywords.filter((k: string) => text.includes(k));
      return { ...c, hits };
    })
    .sort((a, b) => b.hits.length - a.hits.length || (b.member_count ?? 0) - (a.member_count ?? 0))
    .slice(0, 3);

  const { data: mentors } = await supabase
    .from("profiles")
    .select("id, full_name, handle, bio, verified_expert")
    .eq("role", "mentor")
    .neq("id", profile!.id)
    .order("verified_expert", { ascending: false })
    .limit(30);

  const { data: outcomes } = await supabase
    .from("career_outcomes")
    .select("id, kind, title, organization, occurred_on, verification")
    .eq("user_id", profile?.id ?? "")
    .order("occurred_on", { ascending: false })
    .limit(20);
  const today = new Date().toISOString().slice(0, 10);

  const noTaxonomy = analysis?.band === "unknown" && !analysis?.roleId;

  // Only search job boards once the goal resolves to a supported role —
  // otherwise the title pattern is guesswork.
  const opportunities = analysis?.roleId
    ? await findOpportunities(roleTitle)
    : { jobs: [], total: 0, companies: 0 };

  // Rank mentors by how many of the member's core gaps they hold, with the reason.
  const gapIdList = essentialGaps.map((g) => g.skillId);
  const gapLabelMap = new Map(essentialGaps.map((g) => [g.skillId, g.label]));
  const mentorCover = new Map<string, string[]>();
  if ((mentors ?? []).length && gapIdList.length) {
    const { data: ms } = await supabase
      .from("user_skills")
      .select("user_id, skill_id")
      .in("user_id", (mentors ?? []).map((m) => m.id))
      .in("skill_id", gapIdList);
    (ms ?? []).forEach((r: { user_id: string; skill_id: string }) => {
      const list = mentorCover.get(r.user_id) ?? [];
      list.push(gapLabelMap.get(r.skill_id) ?? "");
      mentorCover.set(r.user_id, list);
    });
  }
  const people = (mentors ?? [])
    .map((m) => {
      const covers = mentorCover.get(m.id) ?? [];
      const reasons: string[] = [];
      if (covers.length) reasons.push(`Has ${covers.slice(0, 2).join(" and ").toLowerCase()}, ${covers.length === 1 ? "one of your gaps" : "among your gaps"}`);
      if (m.verified_expert) reasons.push("Verified expert");
      if (reasons.length === 0) reasons.push("Mentor on ASCENDR");
      return { ...m, covers: covers.length, reasons };
    })
    .sort((a, b) => b.covers - a.covers || Number(b.verified_expert) - Number(a.verified_expert))
    .slice(0, 4);

  const essentialTotal = essentialGaps.length + (analysis?.matched.length ?? 0);
  const matchedCount = analysis?.matched.length ?? 0;
  const optionalGaps = (analysis?.gaps ?? []).filter((g) => g.importance === "optional").slice(0, 6);
  const BAND_CHIP: Record<string, string> = {
    strong: "bg-emerald-50 text-emerald-800 border-emerald-200",
    partial: "bg-amber-50 text-amber-800 border-amber-200",
    stretch: "bg-brand-50 text-brand-700 border-brand-200",
    unknown: "bg-surface text-text-secondary border-border",
  };
  const bandKey = analysis?.band ?? "unknown";

  return (
    <div className="space-y-8 pb-16">
      {/* Page head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Career intelligence</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            Your path to <span className="accent-serif">{String(roleTitle)}</span>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            {goal.horizon_months ? `Target: within ${goal.horizon_months} months. ` : ""}Gaps are calculated from the role&apos;s requirements, never guessed.
          </p>
        </div>
        <Link href="/onboarding" className="w-fit rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40">
          Update goal
        </Link>
      </div>

      {/* Readiness + skill gap analysis */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.45fr]">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Readiness</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${BAND_CHIP[bandKey]}`}>{band.label}</span>
          </div>

          {noTaxonomy ? (
            <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">
              We don&apos;t have a skills profile for &ldquo;{goal.target_title}&rdquo; yet. Supported roles today: product manager, data analyst,
              data scientist, software developer, business analyst, UI designer, project manager, marketing manager, sales manager,
              operations manager, IT help desk.
            </p>
          ) : (
            <>
              <p className="nums mt-5 text-[44px] font-semibold leading-none tracking-tight text-ink">
                {matchedCount}
                <span className="text-[18px] font-normal text-text-secondary"> of {essentialTotal || "\u2013"} core skills</span>
              </p>
              {essentialTotal > 0 && (
                <div className="mt-4 flex gap-1" aria-hidden>
                  {Array.from({ length: essentialTotal }).map((_, i) => (
                    <span key={i} className={`h-2 flex-1 rounded-full ${i < matchedCount ? "bg-ink" : "bg-ink/10"}`} />
                  ))}
                </div>
              )}
              <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">{band.line}</p>
              {analysis && (
                <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                  {explainMatch(analysis).map((r) => (
                    <li key={r} className="flex gap-2 text-[13px] text-ink/80">
                      <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Skill gap analysis</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[14px] font-semibold text-ink">You have</p>
              {analysis && analysis.held.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {analysis.held.map((h) => (
                    <form key={h.skillId} action={unmarkSkillHeld} className="inline">
                      <input type="hidden" name="skill_id" value={h.skillId} />
                      <button
                        title={h.evidence === "self_reported" ? "Remove this skill" : undefined}
                        className={`rounded-full border px-2.5 py-1 text-[12px] ${
                          heldIds.has(h.skillId) && (analysis.matched ?? []).some((m) => m.skillId === h.skillId)
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-border bg-surface text-text-secondary"
                        } hover:border-danger`}
                      >
                        {h.label}
                        {h.evidence === "self_reported" ? " \u00d7" : ""}
                      </button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-text-secondary">No skills added yet. Tick &ldquo;I have this&rdquo; on any skill you already hold.</p>
              )}
              {analysis && analysis.transferable.length > 0 && (
                <div className="mt-5">
                  <p className="text-[13px] font-medium text-ink">Strengths that carry over</p>
                  <p className="mt-1 text-[13px] text-text-secondary">{analysis.transferable.slice(0, 4).map((t) => t.label).join(", ")}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[14px] font-semibold text-ink">Missing, by priority</p>
              {essentialGaps.length ? (
                <ol className="mt-3 divide-y divide-border">
                  {essentialGaps.slice(0, 6).map((g, i) => (
                    <li key={g.skillId} className="flex items-center gap-3 py-2">
                      <span className="nums w-5 text-[12px] text-text-secondary">{i + 1}</span>
                      <span className="flex-1 text-[13px] font-medium text-ink">{g.label}</span>
                      <form action={markSkillHeld}>
                        <input type="hidden" name="skill_id" value={g.skillId} />
                        <input type="hidden" name="goal_id" value={goal.id} />
                        <button className="rounded-full border border-ink/15 px-2.5 py-1 text-[11px] font-medium text-ink hover:border-ink/40">I have this</button>
                      </form>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-[13px] text-text-secondary">
                  {analysis?.roleId ? "No core gaps. You cover every core skill we know for this role." : "Gaps appear once your goal maps to a role."}
                </p>
              )}
              {optionalGaps.length > 0 && (
                <p className="mt-3 text-[12px] text-text-secondary">
                  Nice to have: {optionalGaps.map((g) => g.label).join(", ")}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 90-day roadmap */}
      {roadmap.total > 0 && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <Roadmap roadmap={roadmap} goalId={goal.id} roleTitle={String(roleTitle)} />
        </div>
      )}

      {/* People + communities */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-[16px] font-semibold text-ink">People who can help</h2>
            <Link href="/app/members" className="text-[13px] font-medium text-text-secondary hover:text-ink">See all \u2192</Link>
          </div>
          {people.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-text-secondary">As mentors join, the ones closest to {String(roleTitle)} appear here.</p>
          ) : (
            <ul className="divide-y divide-border">
              {people.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-6 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
                    {(m.full_name ?? m.handle ?? "M").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink">{m.full_name ?? m.handle ?? "Mentor"}</p>
                    <ul className="mt-1 space-y-0.5">
                      {m.reasons.map((r) => (
                        <li key={r} className="text-[12px] text-text-secondary">{r}</li>
                      ))}
                    </ul>
                  </div>
                  <Link href={`/app/members/${m.id}`} className="rounded-full border border-ink/15 px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-[16px] font-semibold text-ink">Communities to join</h2>
            <Link href="/app/communities" className="text-[13px] font-medium text-text-secondary hover:text-ink">Browse \u2192</Link>
          </div>
          {rankedCommunities.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-text-secondary">No public communities yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rankedCommunities.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/communities/${c.slug}`} className="flex items-center gap-3 px-6 py-4 hover:bg-surface/60">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">
                      {c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{c.name}</p>
                      <p className="truncate text-[12px] text-text-secondary">
                        {c.hits.length > 0 ? `Related to ${c.hits.join(", ")}` : "Popular on ASCENDR"} \u00b7 {c.member_count ?? 0} members
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Open roles */}
      <section className="rounded-2xl border border-border bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-semibold text-ink">Open {String(roleTitle)} roles</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${BAND_CHIP[bandKey]}`}>Your fit: {band.label.toLowerCase()}</span>
          </div>
          {opportunities.total > 0 && (
            <p className="text-[12px] text-text-secondary">
              {opportunities.total} live across {opportunities.companies} {opportunities.companies === 1 ? "company" : "companies"}
            </p>
          )}
        </div>
        {opportunities.jobs.length === 0 ? (
          <p className="px-6 py-8 text-center text-[13px] text-text-secondary">
            {analysis?.roleId ? `No open ${String(roleTitle)} roles on the boards we track right now. We check every hour.` : "Open roles appear once your goal maps to a role."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {opportunities.jobs.map((j) => (
              <li key={j.id}>
                <a href={j.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-6 py-4 hover:bg-surface/60">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-[13px] font-semibold text-ink">
                    {j.company.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{j.title}</p>
                    <p className="truncate text-[12px] text-text-secondary">
                      {j.company}
                      {j.location ? ` \u00b7 ${j.location}` : ""}
                      {j.remote ? " \u00b7 Remote" : ""}
                    </p>
                  </div>
                  {j.seniority === "senior" && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary">Senior</span>
                  )}
                  <span className="text-[13px] text-text-secondary">\u2197</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Wins */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[16px] font-semibold text-ink">Your wins</h2>
          <p className="text-[12px] text-text-secondary">Marked self-reported. Outcomes are how ASCENDR learns what moves careers.</p>
        </div>

        {(outcomes ?? []).length > 0 && (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {(outcomes ?? []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <div>
                    <p className="text-[14px] font-medium text-ink">{outcomeLabel(o.kind)}</p>
                    <p className="text-[12px] text-text-secondary">
                      {[o.title, o.organization, o.occurred_on].filter(Boolean).join(" \u00b7 ")}
                    </p>
                  </div>
                </div>
                <form action={deleteOutcome}>
                  <input type="hidden" name="outcome_id" value={o.id} />
                  <button className="text-[12px] text-text-secondary hover:text-danger">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={recordOutcome} className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] sm:items-end">
          <input type="hidden" name="goal_id" value={goal.id} />
          <label className="text-[12px] font-medium text-text-secondary">
            What happened?
            <select name="kind" required className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-[14px] text-ink">
              {OUTCOME_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </label>
          <label className="text-[12px] font-medium text-text-secondary">
            Role or detail
            <input name="title" maxLength={200} placeholder="Associate PM" className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-[14px] text-ink" />
          </label>
          <label className="text-[12px] font-medium text-text-secondary">
            Organisation
            <input name="organization" maxLength={200} placeholder="Company" className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-[14px] text-ink" />
          </label>
          <label className="text-[12px] font-medium text-text-secondary">
            When
            <input type="date" name="occurred_on" max={today} defaultValue={today} className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-[14px] text-ink" />
          </label>
          <button className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">Log win</button>
        </form>
      </section>
    </div>
  );
}
