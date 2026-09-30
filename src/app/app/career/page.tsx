import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { analyzeGap, explainMatch, type GapAnalysis } from "@/lib/career/gap";
import { trackAsync } from "@/lib/analytics";
import { markSkillHeld, unmarkSkillHeld } from "./actions";

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
  stretch: { label: "Stretch goal", tone: "bg-brand-50 text-primary border-brand-200", line: "This is a real move. Start with the first few core skills below." },
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
        <h1 className="font-display text-h2">Set a career goal to start</h1>
        <p className="mt-4 text-body text-text-secondary">
          Career Intelligence compares where you are with where you want to go. It needs a destination first.
        </p>
        <Link href="/onboarding" className="mt-8 inline-block rounded-sm bg-primary px-6 py-3 font-semibold text-white hover:bg-brand-600">
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
  const roadmap = essentialGaps.slice(0, 5);
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
    .limit(3);

  const noTaxonomy = analysis?.band === "unknown" && !analysis?.roleId;

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-16">
      <header>
        <p className="eyebrow text-caption text-primary">Career Intelligence</p>
        <h1 className="mt-2 font-display text-h2 md:text-h1">Your path to {roleTitle}</h1>
        {goal.horizon_months && (
          <p className="mt-2 text-small text-text-secondary">Target horizon: {goal.horizon_months} months</p>
        )}
      </header>

      {/* 1 — Fit */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-card">
        <span className={`inline-block rounded-full border px-3 py-1 text-caption font-semibold ${band.tone}`}>{band.label}</span>
        <p className="mt-3 text-body">{band.line}</p>
        {noTaxonomy ? (
          <p className="mt-3 text-small text-text-secondary">
            We don&apos;t have a skills profile for &ldquo;{goal.target_title}&rdquo; yet. Supported roles today: product manager,
            data analyst, data scientist, software developer, business analyst, UI designer, project manager, marketing manager,
            sales manager, operations manager, IT help desk.
          </p>
        ) : (
          analysis && (
            <ul className="mt-4 space-y-1 text-small text-text-secondary">
              {explainMatch(analysis).map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )
        )}
      </section>

      {/* 2 — Roadmap */}
      {roadmap.length > 0 && (
        <section>
          <h2 className="font-display text-h3">Your roadmap</h2>
          <p className="mt-1 text-small text-text-secondary">
            The core skills for {roleTitle} you haven&apos;t told us you have, most important first. Already have one? Mark it and your plan updates.
          </p>
          <ol className="mt-5 space-y-3">
            {roadmap.map((g, i) => (
              <li key={g.skillId} className="flex items-start gap-4 rounded-md border border-border bg-card p-4">
                <span className="nums flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-small font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{g.label}</p>
                  {i === 0 && <p className="mt-0.5 text-caption font-semibold text-primary">Your next best action</p>}
                </div>
                <form action={markSkillHeld}>
                  <input type="hidden" name="skill_id" value={g.skillId} />
                  <input type="hidden" name="goal_id" value={goal.id} />
                  <button className="rounded-sm border border-border px-3 py-1.5 text-caption font-semibold hover:border-primary hover:text-primary">
                    I have this
                  </button>
                </form>
              </li>
            ))}
          </ol>
          {essentialGaps.length > roadmap.length && (
            <p className="mt-3 text-caption text-text-secondary">
              +{essentialGaps.length - roadmap.length} more core skills after these.
            </p>
          )}
        </section>
      )}

      {/* Skills you have */}
      {analysis && analysis.held.length > 0 && (
        <section>
          <h2 className="font-display text-h4">Skills you&apos;ve added</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.held.map((h) => (
              <form key={h.skillId} action={unmarkSkillHeld} className="inline">
                <input type="hidden" name="skill_id" value={h.skillId} />
                <button
                  title={h.evidence === "self_reported" ? "Remove" : undefined}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-caption text-text-secondary hover:border-danger"
                >
                  {h.label} {h.evidence === "self_reported" ? "×" : ""}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 3 — Mentors */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-h4">People who can help</h2>
          {(mentors ?? []).length === 0 ? (
            <p className="mt-3 text-small text-text-secondary">No mentors on ASCENDR yet. As mentors join, the ones closest to {roleTitle} will appear here.</p>
          ) : (
            <>
              <p className="mt-1 text-caption text-text-secondary">
                Mentors on ASCENDR. Matching on your specific gaps arrives once mentors list their skills.
              </p>
              <ul className="mt-4 space-y-3">
                {mentors!.map((m) => (
                  <li key={m.id}>
                    <Link href={`/app/members/${m.id}`} className="font-semibold hover:text-primary">
                      {m.full_name ?? m.handle ?? "Mentor"}
                    </Link>
                    {m.verified_expert && <span className="ml-2 text-caption text-primary">Verified expert</span>}
                    {m.bio && <p className="line-clamp-2 text-caption text-text-secondary">{m.bio}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* 4 — Communities */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-h4">Communities to join</h2>
          {rankedCommunities.length === 0 ? (
            <p className="mt-3 text-small text-text-secondary">No public communities yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rankedCommunities.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/communities/${c.slug}`} className="font-semibold hover:text-primary">{c.name}</Link>
                  <p className="text-caption text-text-secondary">
                    {c.hits.length > 0 ? `Related to ${c.hits.join(", ")}` : "Popular on ASCENDR"} · {c.member_count ?? 0} members
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 5 — Opportunities */}
      <section className="rounded-lg border border-dashed border-border bg-surface p-6">
        <h2 className="font-display text-h4">Opportunities</h2>
        <p className="mt-2 text-small text-text-secondary">
          Coming next: live {roleTitle} roles from public company job boards, each checked against the skills above so you can see which are within reach.
        </p>
      </section>
    </div>
  );
}
