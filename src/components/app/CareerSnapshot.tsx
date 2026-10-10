import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { analyzeGap, type GapAnalysis } from "@/lib/career/gap";

/**
 * Career Dashboard header for /app — the first thing a member sees.
 *
 * Answers the strategy memo's question "what should I do next?" before
 * anything social: goal, fit band, the first core gaps, ONE next best action,
 * and the 7-day action count that the activation metric is built on.
 *
 * Honesty rules (PRD §4, §11):
 *   - The next best action is chosen by fixed rules below, not by a model, so
 *     it is explainable ("why this?") and the same state always gives the
 *     same answer.
 *   - Fit is a band, never a percentage.
 */

type Band = GapAnalysis["band"];

const BAND: Record<Band, { label: string; tone: string }> = {
  strong: { label: "Strong fit", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  partial: { label: "Partial fit", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  stretch: { label: "Stretch goal", tone: "border-brand-200 bg-brand-50 text-brand-700" },
  unknown: { label: "Not analysed yet", tone: "border-border bg-surface text-text-secondary" },
};

export type NextAction = { title: string; why: string; href: string; cta: string };

export function pickNextAction(input: {
  hasGoal: boolean;
  analysis: GapAnalysis | null;
  firstGap: string | null;
  communityCount: number;
  outcomeCount: number;
  roleTitle: string;
}): NextAction {
  const { hasGoal, analysis, firstGap, communityCount, outcomeCount, roleTitle } = input;

  if (!hasGoal) {
    return {
      title: "Set your career goal",
      why: "Everything ASCENDR recommends is measured against where you want to go.",
      href: "/onboarding",
      cta: "Set my goal",
    };
  }
  if (!analysis?.roleId) {
    return {
      title: `Confirm ${roleTitle} as your target role`,
      why: "We need a role we can compare your skills against before we can show your gaps.",
      href: "/app/career",
      cta: "Open career plan",
    };
  }
  if (analysis.held.length === 0) {
    return {
      title: "Add the skills you already have",
      why: "Your gap is the role's requirements minus your skills. With none added, every skill looks missing.",
      href: "/app/career",
      cta: "Add skills",
    };
  }
  if (firstGap) {
    return {
      title: `Start on ${firstGap}`,
      why: `It is the highest-priority core skill for ${roleTitle} that you don't have yet.`,
      href: "/app/career#roadmap",
      cta: "See your roadmap",
    };
  }
  if (communityCount === 0) {
    return {
      title: "Join a community for your goal",
      why: "The people who have made this move are easiest to reach where they already talk.",
      href: "/app/communities",
      cta: "Browse communities",
    };
  }
  if (outcomeCount === 0) {
    return {
      title: "Log your first win",
      why: "An interview, an introduction, a skill certified. Outcomes are how progress gets measured.",
      href: "/app/career",
      cta: "Log a win",
    };
  }
  return {
    title: `Look at open ${roleTitle} roles`,
    why: "You cover the core skills for this role. Time to test it against real openings.",
    href: "/app/career",
    cta: "See roles",
  };
}

export async function CareerSnapshot({ profileId, communityCount }: { profileId: string; communityCount: number }) {
  const supabase = createClient();

  const { data: goal } = await supabase
    .from("career_goals")
    .select("id, target_title, horizon_months")
    .eq("user_id", profileId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [analysis, actionsRes, outcomesRes] = await Promise.all([
    goal ? analyzeGap(profileId, goal.id) : Promise.resolve(null),
    supabase
      .from("career_actions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profileId)
      .eq("status", "completed")
      .gte("completed_at", weekAgo),
    supabase.from("career_outcomes").select("id", { count: "exact", head: true }).eq("user_id", profileId),
  ]);

  const actionsThisWeek = actionsRes.count ?? 0;
  const outcomeCount = outcomesRes.count ?? 0;

  const roleTitle = analysis?.roleTitle ?? goal?.target_title ?? "your target role";
  const band = BAND[analysis?.band ?? "unknown"];
  const essentialGaps = (analysis?.gaps ?? []).filter((g) => g.importance === "essential");
  const topGaps = essentialGaps.slice(0, 3);

  const next = pickNextAction({
    hasGoal: Boolean(goal),
    analysis,
    firstGap: topGaps[0]?.label ?? null,
    communityCount,
    outcomeCount,
    roleTitle,
  });

  return (
    <section className="rounded-2xl border border-border bg-white shadow-card">
      <div className="grid gap-0 md:grid-cols-[1.25fr_1fr]">
        {/* Goal + gaps */}
        <div className="p-6 md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-text-secondary">Your goal</p>
            {goal && (
              <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${band.tone}`}>
                {band.label}
              </span>
            )}
          </div>

          {goal ? (
            <>
              <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-text">{roleTitle}</h2>
              {goal.horizon_months && (
                <p className="mt-1 text-[14px] text-text-secondary">Within {goal.horizon_months} months</p>
              )}

              {topGaps.length > 0 ? (
                <div className="mt-5">
                  <p className="text-[14px] text-text-secondary">
                    {essentialGaps.length === 1
                      ? "1 core skill to close"
                      : `${essentialGaps.length} core skills to close, starting with:`}
                  </p>
                  <ul className="mt-2 divide-y divide-border border-y border-border">
                    {topGaps.map((g, i) => (
                      <li key={g.skillId} className="flex items-center gap-3 py-2.5 text-[14px]">
                        <span className="nums w-5 text-text-secondary">{i + 1}</span>
                        <span className="font-medium text-text">{g.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : analysis?.roleId ? (
                <p className="mt-5 text-[14px] text-text-secondary">
                  You cover the core skills we know about for this role.
                </p>
              ) : (
                <p className="mt-5 text-[14px] text-text-secondary">
                  Your gaps will show here once your goal is matched to a role.
                </p>
              )}

              <Link href="/app/career" className="mt-5 inline-block text-[13px] font-medium text-ink underline-offset-2 hover:underline">
                Open full career plan →
              </Link>
            </>
          ) : (
            <p className="mt-2 text-body text-text-secondary">
              You haven&apos;t set a goal yet. Pick where you want to go and ASCENDR will show what stands in the way.
            </p>
          )}
        </div>

        {/* Next best action + momentum */}
        <div className="flex flex-col justify-between gap-6 border-t border-border bg-surface/60 p-6 md:border-l md:border-t-0 md:p-7 md:rounded-r-2xl">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-text-secondary">Do this next</p>
            <p className="mt-2 text-[17px] font-semibold text-text">{next.title}</p>
            <p className="mt-2 text-[14px] text-text-secondary">
              <span className="font-medium text-text">Why: </span>
              {next.why}
            </p>
            <Link
              href={next.href}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-700"
            >
              {next.cta} <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="flex gap-6 border-t border-border pt-4">
            <div>
              <p className="nums text-[17px] font-semibold text-text">{actionsThisWeek}</p>
              <p className="text-[12px] text-text-secondary">actions this week</p>
            </div>
            <div>
              <p className="nums text-[17px] font-semibold text-text">{outcomeCount}</p>
              <p className="text-[12px] text-text-secondary">{outcomeCount === 1 ? "win logged" : "wins logged"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
