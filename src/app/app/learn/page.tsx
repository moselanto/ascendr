import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Learn — courses, paths & certificates.
 *
 * Designed from the ASCENDR Stage 1 design system (there was no dedicated
 * Learn screen in the P1 prototype; the sidebar item pointed nowhere). It
 * surfaces "course" channels from the communities the member belongs to and
 * frames them as an enrollable learning catalog, matching the onboarding hint
 * "Learn a skill — courses, paths & certificates".
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

const PATHS = [
  { title: "Product Manager Track", sub: "6 courses · beginner → advanced", pct: 40, color: "from-primary to-secondary" },
  { title: "Engineering Leadership", sub: "5 courses · intermediate", pct: 20, color: "from-accent to-[#059669]" },
  { title: "Founder Fundamentals", sub: "4 courses · all levels", pct: 0, color: "from-warning to-danger" },
];

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

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-h3 font-bold">Learn</h1>
        <p className="text-small text-text-secondary">
          Courses, learning paths, and certificates to hit your career goal.
        </p>
      </div>

      {/* Continue learning */}
      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-small font-bold uppercase tracking-wide text-text-secondary">
            Continue learning
          </div>
          <span className="text-caption text-text-secondary">60% complete</span>
        </div>
        <div className="mt-2 mb-1.5 font-bold">Leadership 101 · Lesson 4: Delegation</div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <i className="block h-full bg-accent" style={{ width: "60%" }} />
        </div>
        <button className="mt-3.5 rounded-sm bg-primary px-4 py-2.5 text-small font-semibold text-white">
          ▶ Resume lesson
        </button>
      </div>

      {/* Learning paths */}
      <div className="mb-2 text-small font-bold uppercase tracking-wide text-text-secondary">
        Learning paths
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PATHS.map((p) => (
          <div key={p.title} className="overflow-hidden rounded-md border border-border bg-card">
            <div className={`h-20 bg-gradient-to-br ${p.color}`} />
            <div className="p-4">
              <div className="font-bold">{p.title}</div>
              <div className="text-caption text-text-secondary">{p.sub}</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                <i className="block h-full bg-accent" style={{ width: `${p.pct}%` }} />
              </div>
              <div className="mt-1.5 text-caption text-text-secondary">{p.pct}% complete</div>
            </div>
          </div>
        ))}
      </div>

      {/* Courses from your communities */}
      <div className="mb-2 text-small font-bold uppercase tracking-wide text-text-secondary">
        Courses from your communities
      </div>
      {courses.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-text-secondary">
          No courses yet.{" "}
          <Link href="/app/communities" className="font-semibold text-primary">
            Join a community
          </Link>{" "}
          with a course channel to start learning.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/app/communities/${c.communitySlug}`}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 hover:border-primary"
            >
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-[#eef2ff] text-primary">
                ▦
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold">{c.name}</div>
                <div className="truncate text-caption text-text-secondary">{c.communityName}</div>
              </div>
              <span className="ml-auto rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-caption font-semibold text-primary">
                Open
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Certificates */}
      <div className="mb-2 mt-6 text-small font-bold uppercase tracking-wide text-text-secondary">
        Certificates
      </div>
      <div className="rounded-md border border-border bg-card p-4 text-small text-text-secondary">
        Finish a learning path to earn a shareable certificate. Nothing here yet — complete your
        first path to unlock one.
      </div>
    </div>
  );
}
