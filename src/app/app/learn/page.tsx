import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

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

type Path = {
  title: string;
  sub: string;
  pct: number;
  gap: string;
  next: string;
};

const PATHS: Path[] = [
  {
    title: "Product Manager Track",
    sub: "6 courses \u00b7 beginner \u2192 advanced",
    pct: 40,
    gap: "Product strategy",
    next: "Course 3: Roadmapping with evidence",
  },
  {
    title: "Engineering Leadership",
    sub: "5 courses \u00b7 intermediate",
    pct: 20,
    gap: "People management",
    next: "Course 2: Running effective 1:1s",
  },
  {
    title: "Founder Fundamentals",
    sub: "4 courses \u00b7 all levels",
    pct: 0,
    gap: "Fundraising",
    next: "Course 1: Validating your idea",
  },
];

function pathStatus(pct: number) {
  if (pct >= 100) return { label: "Completed", cls: "bg-emerald-50 text-emerald-800" };
  if (pct > 0) return { label: "In progress", cls: "bg-amber-50 text-amber-800" };
  return { label: "Not started", cls: "bg-surface text-text-secondary" };
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

  // The path to continue: the most-advanced path that isn't finished yet.
  const inProgress = PATHS.filter((p) => p.pct > 0 && p.pct < 100).sort((a, b) => b.pct - a.pct);
  const current = inProgress[0] ?? PATHS[0];
  const avgPct = Math.round(PATHS.reduce((sum, p) => sum + p.pct, 0) / PATHS.length);

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
            Courses, learning paths, and certificates to hit your career goal.
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
            href="#paths"
            className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
          >
            Browse paths
          </a>
        </div>
      </div>

      {/* Continue learning + stats */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white">
          <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
          <div className="relative">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">
              Continue learning
            </p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">{current.title}</h2>
            <p className="mt-1 text-[14px] text-white/70">Next up: {current.next}</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-accent" style={{ width: `${current.pct}%` }} />
              </div>
              <span className="nums text-[13px] font-medium text-white/80">{current.pct}%</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-white/90">
                Resume lesson →
              </button>
              <span className="text-[13px] text-white/60">Closes your gap in {current.gap.toLowerCase()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[12px] font-medium text-text-secondary">Paths in progress</p>
            <p className="nums mt-1 text-[28px] font-semibold text-ink">{inProgress.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[12px] font-medium text-text-secondary">Average progress</p>
            <p className="nums mt-1 text-[28px] font-semibold text-ink">{avgPct}%</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[12px] font-medium text-text-secondary">Community courses</p>
            <p className="nums mt-1 text-[28px] font-semibold text-ink">{courses.length}</p>
          </div>
        </div>
      </div>

      {/* Learning paths */}
      <section id="paths">
        <SectionTitle>Learning paths</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((p) => {
            const st = pathStatus(p.pct);
            return (
              <div
                key={p.title}
                className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-lift md:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700">
                    Gap: {p.gap}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${st.cls}`}>{st.label}</span>
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-ink">{p.title}</h3>
                <p className="mt-0.5 text-[13px] text-text-secondary">{p.sub}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${p.pct}%` }} />
                  </div>
                  <span className="nums text-[12px] font-medium text-text-secondary">{p.pct}%</span>
                </div>
                <p className="mt-4 text-[13px] text-text-secondary">
                  <span className="font-medium text-ink">Next:</span> {p.next}
                </p>
                <div className="mt-auto pt-5">
                  <button className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40">
                    {p.pct > 0 ? "Continue \u2192" : "Start path \u2192"}
                  </button>
                </div>
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
              Finish a learning path to earn a shareable certificate for your profile.
            </p>
            <a
              href="#paths"
              className="mt-5 inline-flex rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40"
            >
              Pick a path
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
