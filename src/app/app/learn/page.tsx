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
type Path = { title: string; sub: string; keywords: string[] };

const PATHS: Path[] = [
  { title: "Product Manager Track", sub: "6 courses \u00b7 beginner \u2192 advanced", keywords: ["product"] },
  { title: "Engineering Leadership", sub: "5 courses \u00b7 intermediate", keywords: ["engineer", "developer", "software"] },
  { title: "Founder Fundamentals", sub: "4 courses \u00b7 all levels", keywords: ["founder", "startup"] },
];

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
  const matchesGoal = (p: Path) => roleLower.length > 0 && p.keywords.some((k) => roleLower.includes(k));

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
          <a
            href="/app/career#roadmap"
            className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
          >
            My roadmap
          </a>
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
                <Link href="/app/career#roadmap" className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-white/90">
                  Open roadmap {"\u2192"}
                </Link>
              </>
            ) : goal ? (
              <>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">Nothing to learn on your roadmap right now</h2>
                <p className="mt-1 text-[14px] text-white/70">Either your learning steps are done, or your goal isn&apos;t matched to a role yet.</p>
                <Link href="/app/career" className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-white/90">
                  Open career plan {"\u2192"}
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">Set a goal to get a learning plan</h2>
                <p className="mt-1 text-[14px] text-white/70">ASCENDR turns the skills your target role needs into steps you can learn in order.</p>
                <Link href="/onboarding" className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-white/90">
                  Set my goal {"\u2192"}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[12px] font-medium text-text-secondary">Core skills to learn</p>
            <p className="nums mt-1 text-[28px] font-semibold text-ink">{goal ? essentialGaps.length : "\u2013"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[12px] font-medium text-text-secondary">Learning steps done</p>
            <p className="nums mt-1 text-[28px] font-semibold text-ink">{learnDone}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[12px] font-medium text-text-secondary">Community courses</p>
            <p className="nums mt-1 text-[28px] font-semibold text-ink">{courses.length}</p>
          </div>
        </div>
      </div>

      {/* Learning paths */}
      <section id="paths">
        <SectionTitle>Curated paths</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((p) => {
            const match = matchesGoal(p);
            return (
              <div key={p.title} className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
                <div className="flex items-start justify-between gap-3">
                  {match ? (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700">Matches your goal</span>
                  ) : (
                    <span />
                  )}
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-text-secondary">Coming soon</span>
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-ink">{p.title}</h3>
                <p className="mt-0.5 text-[13px] text-text-secondary">{p.sub}</p>
                <p className="mt-4 text-[13px] text-text-secondary">
                  Curated paths open soon. Until then, your roadmap and community courses are the fastest way to close your gaps.
                </p>
              </div>
            );
          })}
        </div>
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
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <p className="text-[15px] font-semibold text-ink">No certificates yet</p>
            <p className="mt-1 text-[14px] text-text-secondary">
              Certificates arrive with curated paths. Log certifications you earn elsewhere as a win.
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
