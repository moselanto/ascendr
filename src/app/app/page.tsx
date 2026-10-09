import Link from "next/link";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { analyzeGap, type GapAnalysis } from "@/lib/career/gap";
import { buildRoadmap, type RoadmapStep } from "@/lib/career/roadmap";
import { findOpportunities, type Opportunity } from "@/lib/opportunities";
import { pickNextAction } from "@/components/app/CareerSnapshot";
import { togglePlanStep } from "@/app/app/career/actions";

export const dynamic = "force-dynamic";

/**
 * Member dashboard - prototype "Home" layout on real data.
 *
 * Order of the page follows the question a member arrives with:
 *   1. Where am I going?          -> goal hero
 *   2. What do I do now?          -> one next best action, with why
 *   3. Am I moving?               -> four momentum metrics
 *   4. What is on this week?      -> three tickable roadmap steps
 *   5. Who and what can help?     -> people (with reasons), roles, communities
 *
 * Honesty: fit is a band, never a percentage; people are recommended only
 * with a reason we can trace to a row; empty states say what to do next.
 */

const BAND: Record<GapAnalysis["band"], string> = {
  strong: "Strong fit",
  partial: "Partial fit",
  stretch: "Stretch goal",
  unknown: "Not analysed yet",
};

function initials(name: string | null | undefined) {
  return (
    (name || "Member")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M"
  );
}

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-white p-5 shadow-card md:p-6 ${className}`}>{children}</div>;
}

function SectionTitle({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between first:mt-0">
      <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
      {href && (
        <Link href={href} className="text-[13px] font-medium text-text-secondary hover:text-ink">
          {cta ?? "See all"} \u2192
        </Link>
      )}
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className="nums mt-2 text-[30px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-[12px] text-text-secondary">{note}</p>
    </div>
  );
}

type FeedRow = { id: string; body: string; created_at: string; author_id: string; profiles?: { full_name?: string } | null };
type Mentor = { id: string; full_name: string | null; bio: string | null; verified_expert: boolean | null };

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const me = profile?.id ?? "";
  const supabase = createClient();
  const firstName = (profile?.full_name || "there").split(" ")[0];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [goalRes, monthRes, weekRes, outcomesRes, connRes, memRes, feedRes] = await Promise.all([
    supabase
      .from("career_goals")
      .select("id, target_title, horizon_months")
      .eq("user_id", me)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("career_actions").select("id", { count: "exact", head: true }).eq("user_id", me).eq("status", "completed").gte("completed_at", monthStart.toISOString()),
    supabase.from("career_actions").select("id", { count: "exact", head: true }).eq("user_id", me).eq("status", "completed").gte("completed_at", weekAgo),
    supabase.from("career_outcomes").select("id", { count: "exact", head: true }).eq("user_id", me),
    supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${me},addressee_id.eq.${me}`),
    supabase.from("community_members").select("communities:community_id(id, name, slug, member_count)").eq("user_id", me).eq("status", "active").limit(4),
    supabase.from("feed_posts").select("id, body, created_at, author_id, profiles:author_id(full_name)").order("created_at", { ascending: false }).limit(4),
  ]);

  const goal = goalRes.data;
  const analysis = goal ? await analyzeGap(me, goal.id) : null;
  const roleTitle = analysis?.roleTitle ?? goal?.target_title ?? "your target role";
  const essentialGaps = (analysis?.gaps ?? []).filter((g) => g.importance === "essential");
  const essentialTotal = essentialGaps.length + (analysis?.matched.length ?? 0);

  // This week: the next three unfinished roadmap steps.
  let weekly: (RoadmapStep & { skillId: string; skill: string })[] = [];
  let roadmapDone = 0;
  let roadmapTotal = 0;
  if (goal && essentialGaps.length > 0) {
    const { data: stepRows } = await supabase
      .from("career_actions")
      .select("detail")
      .eq("user_id", me)
      .eq("related_type", "plan_step")
      .eq("goal_id", goal.id);
    const completed = new Set((stepRows ?? []).map((r: { detail: string | null }) => r.detail ?? ""));
    const rm = buildRoadmap(essentialGaps, completed);
    roadmapDone = rm.done;
    roadmapTotal = rm.total;
    weekly = rm.phases
      .flatMap((p) => p.skills.flatMap((s) => s.steps.map((st) => ({ ...st, skillId: s.skillId, skill: s.label }))))
      .filter((s) => s.done === false)
      .slice(0, 3);
  }

  const communities = (memRes.data ?? [])
    .map((m) => {
      const raw = (m as unknown as { communities?: unknown }).communities;
      return (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string; slug: string; member_count: number } | null;
    })
    .filter(Boolean) as { id: string; name: string; slug: string; member_count: number }[];

  // People who can help: mentors, ranked by how many of the member's gaps they hold.
  const { data: mentorRows } = await supabase
    .from("profiles")
    .select("id, full_name, bio, verified_expert")
    .eq("role", "mentor")
    .neq("id", me)
    .limit(30);
  const mentors = (mentorRows ?? []) as Mentor[];
  const gapIds = essentialGaps.map((g) => g.skillId);
  const gapLabel = new Map(essentialGaps.map((g) => [g.skillId, g.label]));
  const coverBy = new Map<string, string[]>();
  if (mentors.length && gapIds.length) {
    const { data: ms } = await supabase
      .from("user_skills")
      .select("user_id, skill_id")
      .in("user_id", mentors.map((m) => m.id))
      .in("skill_id", gapIds);
    (ms ?? []).forEach((r: { user_id: string; skill_id: string }) => {
      const list = coverBy.get(r.user_id) ?? [];
      list.push(gapLabel.get(r.skill_id) ?? "");
      coverBy.set(r.user_id, list);
    });
  }
  const people = mentors
    .map((m) => {
      const covers = coverBy.get(m.id) ?? [];
      const reason = covers.length
        ? `Has ${covers.slice(0, 2).join(" and ").toLowerCase()}, ${covers.length === 1 ? "one of your gaps" : "two of your gaps"}`
        : m.verified_expert
        ? "Verified expert on ASCENDR"
        : "Mentor on ASCENDR";
      return { ...m, covers: covers.length, reason };
    })
    .sort((a, b) => b.covers - a.covers || Number(b.verified_expert) - Number(a.verified_expert))
    .slice(0, 3);

  let jobs: Opportunity[] = [];
  let jobsTotal = 0;
  if (analysis?.roleId) {
    try {
      const res = await findOpportunities(String(roleTitle), 3);
      jobs = res.jobs;
      jobsTotal = res.total;
    } catch {
      jobs = [];
    }
  }

  const feed = ((feedRes.data as unknown as FeedRow[]) ?? []).slice(0, 4);
  const actionsMonth = monthRes.count ?? 0;
  const actionsWeek = weekRes.count ?? 0;
  const wins = outcomesRes.count ?? 0;
  const connections = connRes.count ?? 0;
  const weekTarget = 3;
  const weekPct = Math.min(100, Math.round((actionsWeek / weekTarget) * 100));

  const next = pickNextAction({
    hasGoal: Boolean(goal),
    analysis,
    firstGap: essentialGaps[0]?.label ?? null,
    communityCount: communities.length,
    outcomeCount: wins,
    roleTitle: String(roleTitle),
  });

  return (
    <div className="space-y-6">
      {/* Page head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Dashboard</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">Welcome back, {firstName}</h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            {goal ? "Your career plan is moving. Here is the one thing that matters next." : "Set a goal and ASCENDR will build the plan around it."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/onboarding" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40">
            {goal ? "Update goal" : "Set my goal"}
          </Link>
          {goal && (
            <Link href="/app/career" className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
              Open career plan
            </Link>
          )}
        </div>
      </div>

      {/* Goal hero + next action */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white md:p-8">
          <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
          <div className="relative">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              {goal ? `Your goal \u00b7 ${BAND[analysis?.band ?? "unknown"]}` : "No goal yet"}
            </span>
            <h2 className="mt-5 text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[36px]">
              {goal ? (
                <>
                  Become a <span className="accent-serif text-brand-200">{String(roleTitle)}</span>
                  {goal.horizon_months ? <span className="text-white/70"> within {goal.horizon_months} months.</span> : "."}
                </>
              ) : (
                <>Where do you want your career to go next?</>
              )}
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/70">
              ASCENDR connects the strengths you already have to the skills, people and roles that move you forward.
            </p>

            {goal && (
              <div className="mt-7 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-5">
                <div>
                  <p className="nums text-[26px] font-semibold leading-none">
                    {analysis?.matched.length ?? 0}
                    <span className="text-[14px] font-normal text-white/50"> of {essentialTotal || "\u2013"}</span>
                  </p>
                  <p className="mt-1.5 text-[12px] text-white/60">Core skills matched</p>
                </div>
                <div>
                  <p className="nums text-[26px] font-semibold leading-none">{actionsMonth}</p>
                  <p className="mt-1.5 text-[12px] text-white/60">Actions this month</p>
                </div>
                <div>
                  <p className="nums text-[26px] font-semibold leading-none">{jobsTotal}</p>
                  <p className="mt-1.5 text-[12px] text-white/60">Open roles matched</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Your next best action</p>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">High impact</span>
          </div>
          <p className="mt-4 text-[20px] font-semibold leading-snug tracking-tight text-ink">{next.title}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            <span className="font-medium text-ink">Why: </span>
            {next.why}
          </p>
          <Link href={next.href} className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
            {next.cta} <span aria-hidden>\u2192</span>
          </Link>
          <div className="mt-auto pt-6">
            <div className="flex justify-between border-t border-border pt-4 text-[12px]">
              <span className="text-text-secondary">This week</span>
              <span className="font-semibold text-ink">
                {actionsWeek} of {weekTarget} actions
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface">
              <div className="h-1.5 rounded-full bg-accent" style={{ width: `${weekPct}%` }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Career actions" value={actionsMonth} note={`${actionsWeek} in the last 7 days`} />
        <Metric label="Roadmap progress" value={roadmapTotal ? `${roadmapDone}/${roadmapTotal}` : "\u2013"} note={roadmapTotal ? "steps completed" : "appears once you have gaps"} />
        <Metric label="Connections" value={connections} note="accepted in your network" />
        <Metric label="Wins logged" value={wins} note="interviews, intros, offers" />
      </div>

      {/* Lower grid */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <SectionTitle title="This week" href="/app/career#roadmap" cta="Full roadmap" />
          <Card className="p-0 md:p-0">
            {weekly.length ? (
              <ul className="divide-y divide-border">
                {weekly.map((s) => (
                  <li key={s.key}>
                    <form action={togglePlanStep} className="flex items-start gap-4 px-5 py-4 md:px-6">
                      <input type="hidden" name="step_key" value={s.key} />
                      <input type="hidden" name="goal_id" value={goal?.id ?? ""} />
                      <input type="hidden" name="skill_id" value={s.skillId} />
                      <input type="hidden" name="title" value={s.title} />
                      <input type="hidden" name="done" value="0" />
                      <button
                        aria-label={`Mark done: ${s.title}`}
                        className="mt-0.5 h-5 w-5 shrink-0 rounded-md border border-border bg-white transition-colors hover:border-ink"
                      />
                      <div className="flex-1">
                        <p className="text-[15px] font-medium text-ink">{s.title}</p>
                        <p className="mt-0.5 text-[13px] text-text-secondary">
                          {s.kind === "learn" ? "Learning" : s.kind === "practice" ? "Practice" : "People"} \u00b7 {s.skill}
                        </p>
                      </div>
                      <Link
                        href={s.kind === "people" ? "/app/members" : s.kind === "learn" ? "/app/learn" : "/app/career#roadmap"}
                        className="text-[13px] font-medium text-text-secondary hover:text-ink"
                      >
                        Open \u2192
                      </Link>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-[15px] font-medium text-ink">{goal ? "Nothing scheduled this week" : "Your weekly plan starts with a goal"}</p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  {goal ? "Add the skills you have and your roadmap will fill this list." : "Set a goal and we will turn it into three actions a week."}
                </p>
                <Link href={goal ? "/app/career" : "/onboarding"} className="mt-4 inline-flex rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40">
                  {goal ? "Open career plan" : "Set my goal"}
                </Link>
              </div>
            )}
          </Card>

          <SectionTitle title="Recent activity" href="/app/feed" cta="Open feed" />
          <Card className="p-0 md:p-0">
            {feed.length ? (
              <ul className="divide-y divide-border">
                {feed.map((p) => (
                  <li key={p.id} className="flex gap-3 px-5 py-4 md:px-6">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-[12px] font-semibold text-ink">
                      {initials(p.profiles?.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px]">
                        <Link href={`/app/members/${p.author_id}`} className="font-semibold text-ink hover:underline">
                          {p.profiles?.full_name || "Member"}
                        </Link>
                        <span className="text-text-secondary"> \u00b7 {timeAgo(p.created_at)}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[14px] text-ink/80">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-8 text-center text-[13px] text-text-secondary">
                Quiet so far.{" "}
                <Link href="/app/feed" className="font-medium text-ink underline-offset-2 hover:underline">
                  Share the first post
                </Link>
              </p>
            )}
          </Card>
        </div>

        <div>
          <SectionTitle title="People who can help" href="/app/members" />
          <Card className="p-0 md:p-0">
            {people.length ? (
              <ul className="divide-y divide-border">
                {people.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
                      {initials(m.full_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{m.full_name || "Mentor"}</p>
                      <p className="truncate text-[12px] text-text-secondary">{m.reason}</p>
                    </div>
                    <Link href={`/app/members/${m.id}`} className="rounded-full border border-ink/15 px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40">
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-[13px] text-text-secondary">Mentors who cover your gaps will appear here as they join.</p>
            )}
          </Card>

          <SectionTitle title="Roles in reach" href="/app/career" />
          <Card className="p-0 md:p-0">
            {jobs.length ? (
              <ul className="divide-y divide-border">
                {jobs.map((j) => (
                  <li key={j.id}>
                    <a href={j.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-4 hover:bg-surface/60">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-[13px] font-semibold text-ink">
                        {j.company.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink">{j.title}</p>
                        <p className="truncate text-[12px] text-text-secondary">
                          {j.company} \u00b7 {j.remote ? "Remote" : j.location}
                        </p>
                      </div>
                      <span className="text-[12px] text-text-secondary">\u2197</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-[13px] text-text-secondary">
                {analysis?.roleId ? "No open roles right now. We check the boards every hour." : "Open roles appear once your goal is matched to a role."}
              </p>
            )}
          </Card>

          <SectionTitle title="Your communities" href="/app/communities" />
          <Card className="p-0 md:p-0">
            {communities.length ? (
              <ul className="divide-y divide-border">
                {communities.map((c) => (
                  <li key={c.id}>
                    <Link href={`/app/communities/${c.slug}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface/60">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">
                        {initials(c.name)}
                      </span>
                      <span className="flex-1 truncate text-[14px] font-medium text-ink">{c.name}</span>
                      <span className="nums text-[12px] text-text-secondary">{c.member_count ?? 0} members</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-[13px] text-text-secondary">Join a community where people who made your move already talk.</p>
                <Link href="/app/communities" className="mt-3 inline-flex rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40">
                  Browse communities
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
