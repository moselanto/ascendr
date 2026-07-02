// ASCENDR AI Studio — coach, mentor clones, and career tools.
// (redeploy marker: force production onto latest main)
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { AI_CONFIGURED } from "@/lib/ai";
import AICoachesTab from "./AICoachesTab";
import CareerPlanTab from "./CareerPlanTab";
import ResumeReviewTab from "./ResumeReviewTab";
import InterviewPrepTab from "./InterviewPrepTab";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "coaches", label: "AI Coaches & Clone" },
  { key: "plan", label: "Career Plan" },
  { key: "resume", label: "Resume Review" },
  { key: "interview", label: "Interview Prep" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function AIStudioPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab: TabKey = (TABS.some((t) => t.key === searchParams.tab)
    ? searchParams.tab
    : "coaches") as TabKey;

  const supabase = createClient();
  const profile = await getCurrentProfile();

  // Load saved artifacts for the active tab (cheap, per-user).
  let plans: any[] = [];
  let latestReview: any = null;
  if (profile && tab === "plan") {
    const { data } = await supabase
      .from("career_plans")
      .select("id, goal, horizon, summary, steps, created_at")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    plans = (data ?? []).map((p) => ({ ...p, steps: Array.isArray(p.steps) ? p.steps : [] }));
  }
  if (profile && tab === "resume") {
    const { data } = await supabase
      .from("resume_reviews")
      .select("id, file_name, target_role, score, verdict, strengths, fixes, rewrite, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestReview = data
      ? {
          ...data,
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          fixes: Array.isArray(data.fixes) ? data.fixes : [],
        }
      : null;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-h3 font-bold">AI Studio</h1>
        <p className="text-small text-text-secondary mt-1">Your coach, clones, and career tools.</p>
      </div>

      {!AI_CONFIGURED && (
        <div className="mb-4 rounded-md border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-small text-[#92400e]">
          The AI features are in demo mode. Add an <code>OPENAI_API_KEY</code> to your Vercel
          environment variables to switch on live, grounded responses. Everything still works and
          saves — you&apos;ll just see scaffolded output until the key is set.
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-md border border-border bg-card">
        <nav className="flex gap-1 overflow-x-auto px-3">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/app/ai?tab=${t.key}`}
              className={`shrink-0 border-b-2 px-4 py-3 text-small font-semibold ${
                t.key === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Active tab content */}
      <div className="mt-5">
        {tab === "coaches" && <AICoachesTab />}
        {tab === "plan" && <CareerPlanTab initialPlans={plans} />}
        {tab === "resume" && <ResumeReviewTab latest={latestReview} />}
        {tab === "interview" && <InterviewPrepTab />}
      </div>
    </div>
  );
}
