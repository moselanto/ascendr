import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { analyzeGap } from "@/lib/career/gap";
import { buildRoadmap } from "@/lib/career/roadmap";

export const dynamic = "force-dynamic";

/**
 * Learn — courses, paths & certificates.
 *
 * Surfaces "course" channels from the communities the member belongs to and
 * frames them as an enrollable learning catalog alongside curated learning
 * paths, styled with the ASCENDR design system.
 */

type CourseRow = {
  id: string;
  name: string;
  community_id: string;
  communities?: unknown;
};

type Course = {
  id: string;
  name: string;
  communitySlug: string;
  communityName: string;
};

/**
 * Curated paths are a catalogue only. ASCENDR does not track path or lesson
 * progress yet, so no progress, status or "your gap" claim is shown for
 * them. A path is marked as matching the member only when its keywords
 * appear in their goal role title (a traceable string match).
 */
type RoleReq = { role_id: string; importance: string; weight: number | null; skills: unknown };

function labelOf(x: unknown): string | null {
  if (Array.isArray(x)) return (x[0] as { preferred_label?: string } | undefined)?.preferred_label ?? null;
  return (x as { preferred_label?: string } | null)?.preferred_label ?? null;
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{children}</h2>
      {action}
    </div>
  );
}

export default async function LearnPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", profile!.id)
    .eq("status", "active");
  const communityIds = (memberships ?? []).map((m) => m.community_id);

  let courses: Course[] = [];
  if (communityIds.length) {
    const { data: rows } = await supabase
      .from("community_channels")
      .select("id, name, community_id, communities:community_id(name, slug)")
      .in("community_id", communityIds)
      .eq("kind", "courses");

    courses = ((rows as CourseRow[]) ?? []).map((r) => {
      const comm = (Array.isArray(r.communities) ? r.communities[0] : r.communities) as
        | { name: string; slug: string }
        | null
        | undefined;
      return {
        id: r.id,
        name: r.name,
        communitySlug: comm?.slug ?? "",
        communityName: comm?.name ?? "Community",
      };
    });
  }

  // Real learning signal: the member's core gaps and their roadmap "learn" steps.
  const me = profile?.id ?? "";
  const { data: goal } = await supabase
    .from("career_goals")
    .select("id, target_title")
    .eq("user_id", me)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const analysis = goal ? await analyzeGap(me, goal.id) : null;
  const roleTitle = analysis?.roleTitle ?? goal?.target_title ?? "";
  const essentialGaps = (analysis?.gaps ?? []).filter((g) => g.importance === "essential");
  let learnDone = 0;
  let nextLearn: { title: string; skill: string } | null = null;
  if (goal && essentialGaps.length) {
    const { data: stepRows } = await supabase
      .from("career_actions")
      .select("detail")
      .eq("user_id", me)
      .eq("related_type", "plan_step")
      .eq("goal_id", goal.id);
    const completed = new Set((stepRows ?? []).map((r: { detail: string | null }) => r.detail ?? ""));
    const rm = buildRoadmap(essentialGaps, completed);
    const learnSteps = rm.phases.flatMap((ph) => ph.skills.flatMap((sk) => sk.steps.filter((st) => st.kind === "learn").map((st) => ({ ...st, skill: sk.label }))));
    learnDone = learnSteps.filter((st) => st.done).length;
    const nxt = learnSteps.find((st) => st.done === false);
    nextLearn = nxt ? { title: nxt.title, skill: nxt.skill } : null;
  }
  const roleLower = roleTitle.toLowerCase();

  // Learning paths by role: real requirements from role_profiles (ESCO).
  const [{ data: roleRows }, { data: reqRows }] = await Promise.all([
    supabase.from("role_profiles").select("id, title").order("title"),
    supabase.from("role_required_skills").select("role_id, importance, weight, skills(preferred_label)"),
  ]);
  const reqs = (reqRows ?? []) as unknown as RoleReq[];
  const rolePaths = ((roleRows ?? []) as { id: string; title: string }[])
    .map((r) => {
      const mine = reqs.filter((q) => q.role_id === r.id);
      const ess = mine
        .filter((q) => q.importance === "essential")
        .sort((x, y) => (y.weight ?? 0) - (x.weight ?? 0));
      return {
        id: r.id,
        title: r.title,
        isGoal: roleLower.length > 0 && r.title.toLowerCase() === roleLower,
        essential: ess.length,
        optional: mine.length - ess.length,
        top: ess.map((q) => labelOf(q.skills)).filter((l): l is string => Boolean(l)).slice(0, 3),
      };
    })
    .filter((r) => r.essential > 0)
    .sort((x, y) => Number(y.isGoal) - Number(x.isGoal))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Page head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Learn</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            Learning paths that <span className="accent-serif">close your gaps.</span>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            What your roadmap says to learn next, plus courses from your communities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/communities"
            className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40"
          >
            Find courses
          </Link>
          <Link
            href="/app/career#roadmap"
            className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
          >
            My roadmap
          </Link>
        </div>
      </div>

      {/* Continue learning + stats */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white">
          <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
          <div className="relative">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">Learn next</p>
            {nextLearn ? (
              <>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">{nextLearn.title}</h2>
                <p className="mt-1 text-[14px] text-white/70">
                  From your 90-day roadmap. {nextLearn.skill} is a core skill for {roleTitle} that you don&apos;t have yet.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/app/career#roadmap" className="inline-flex rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-white/90">
                    Mark done on roadmap {"→"}
                  </Link>
                  <a
                    href={`https://www.coursera.org/search?query=${encodeURIComponent(nextLearn.skill)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-white/25 px-4 py-2.5 text-[14px] font-medium text-white hover:border-white/60"
                  >
                    Find a course
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(nextLearn.skill + " tutorial")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-white/25 px-4 py-2.5 text-[14px] font-medium text-white hover:border-white/60"
                  >
                    Free videos
                  </a>
                </div>
              </>
            ) : goal ? (
              <>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">Nothing to learn on your roadmap right now</h2>
                <p className="mt-1 text-[14px] text-white/70">Either your learning steps are done, or your goal isn&apos;t matched to a role yet.</p>
                <Link href="/app/career" className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-white/90">
                  Open career plan {"→"}
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">Set a goal to get a learning plan</h2>
                <p className="mt-1 text-[14px] text-white/70">ASCENDR turns the skills your target role needs into steps you can learn in order.</p>
                <Link href="/onboarding" className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-white/90">
                  Set my goal {"→"}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card md:p-5">
            <p className="text-[11px] font-medium leading-tight text-text-secondary md:text-[12px]">Core skills to learn</p>
            <p className="nums mt-1 text-[24px] font-semibold text-ink md:text-[28px]">{goal ? essentialGaps.length : "–"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card md:p-5">
            <p className="text-[11px] font-medium leading-tight text-text-secondary md:text-[12px]">Learning steps done</p>
            <p className="nums mt-1 text-[24px] font-semibold text-ink md:text-[28px]">{learnDone}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card md:p-5">
            <p className="text-[11px] font-medium leading-tight text-text-secondary md:text-[12px]">Community courses</p>
            <p className="nums mt-1 text-[24px] font-semibold text-ink md:text-[28px]">{courses.length}</p>
          </div>
        </div>
      </div>

      {/* Role learning paths (real Career Graph data) */}
      <section id="paths">
        <SectionTitle
          action={
            <Link href="/app/search" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
              Search roles {"→"}
            </Link>
          }
        >
          Learning paths by role
        </SectionTitle>
        {rolePaths.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <p className="text-[15px] font-semibold text-ink">No role paths yet</p>
            <p className="mt-1 text-[14px] text-text-secondary">Role skill data hasn&apos;t been imported yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rolePaths.map((r) => (
              <div key={r.id} className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
                <div className="flex items-start justify-between gap-3">
                  {r.isGoal ? (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700">Your goal</span>
                  ) : (
                    <span />
                  )}
                  <span className="text-[12px] text-text-secondary">ESCO</span>
                </div>
                <h3 className="mt-4 text-[16px] font-semibold capitalize text-ink">{r.title}</h3>
                <p className="mt-0.5 text-[13px] text-text-secondary">
                  {r.essential} essential {"·"} {r.optional} nice-to-have skills
                </p>
                {r.top.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {r.top.map((l) => (
                      <li key={l} className="rounded-full bg-surface px-2.5 py-1 text-[12px] text-ink/80">{l}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-5">
                  {r.isGoal ? (
                    <Link href="/app/career#roadmap" className="inline-flex rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink-700">
                      Continue my path {"→"}
                    </Link>
                  ) : (
                    <Link href="/onboarding" className="inline-flex rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40">
                      Make this my goal
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Courses from communities + certificates */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle
            action={
              <Link href="/app/communities" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
                All communities →
              </Link>
            }
          >
            Courses from your communities
          </SectionTitle>
          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
              <p className="text-[15px] font-semibold text-ink">No community courses yet</p>
              <p className="mt-1 text-[14px] text-text-secondary">
                Join a community with a course channel and its lessons will show up here.
              </p>
              <Link
                href="/app/communities"
                className="mt-5 inline-flex rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
              >
                Browse communities
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
              {courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/app/communities/${c.communitySlug}`}
                  className="flex items-center gap-3 px-5 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface"
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
                    {(c.communityName || "C").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-ink">{c.name}</div>
                    <div className="truncate text-[13px] text-text-secondary">{c.communityName}</div>
                  </div>
                  <span className="ml-auto rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink">
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle>Certificates</SectionTitle>
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
            <p className="text-[15px] font-semibold text-ink">No certificates yet</p>
            <p className="mt-1 text-[14px] text-text-secondary">
              Earned a certification on Coursera, LinkedIn or elsewhere? Log it as a win and it shows on your outcomes.
            </p>
            <Link
              href="/app/outcomes#log"
              className="mt-5 inline-flex rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40"
            >
              Log a certification
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
