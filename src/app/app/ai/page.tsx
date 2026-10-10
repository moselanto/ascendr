import type { ComponentProps } from "react";
// ASCENDR AI Studio — coach, mentor clones, and career tools.
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
  { key: "coaches", label: "Coach" },
  { key: "plan", label: "Career plan" },
  { key: "resume", label: "Resume review" },
  { key: "interview", label: "Interview prep" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function AIStudioPage(
  props: {
    searchParams: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const tab: TabKey = (TABS.some((t) => t.key === searchParams.tab)
    ? searchParams.tab
    : "coaches") as TabKey;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  // Active career goal (used to tailor the coach's suggested prompts).
  let goalTitle: string | null = null;
  if (profile && tab === "coaches") {
    const { data: goal } = await supabase
      .from("career_goals")
      .select("target_title")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    goalTitle = (goal?.target_title as string | null | undefined) ?? null;
  }

  // Load saved artifacts for the active tab (cheap, per-user).
  let plans: ComponentProps<typeof CareerPlanTab>["initialPlans"] = [];
  let latestReview: ComponentProps<typeof ResumeReviewTab>["latest"] = null;
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
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">AI Studio</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            Your career, <span className="accent-serif">coached</span>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Talk to your coach, build a plan, sharpen your resume and rehearse interviews.
          </p>
        </div>
        <Link
          href="/app/career"
          className="self-start rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40 md:self-auto"
        >
          Career intelligence →
        </Link>
      </div>

      {!AI_CONFIGURED && (
        <div className="mt-5 rounded-2xl border border-border bg-amber-50 px-5 py-4 text-[14px] text-amber-800">
          <span className="font-semibold">AI is not configured yet.</span> Add an{" "}
          <code className="rounded bg-white/70 px-1 py-0.5 text-[13px]">OPENAI_API_KEY</code> to your
          environment variables to switch on live, grounded responses. Everything still saves; you&apos;ll
          see scaffolded output until the key is set.
        </div>
      )}

      {/* Tabs */}
      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-border bg-white p-1 shadow-card md:w-fit">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/app/ai?tab=${t.key}`}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium ${
              t.key === tab ? "bg-ink text-white" : "text-text-secondary hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Active tab content */}
      <div className="mt-5">
        {tab === "coaches" && <AICoachesTab goalTitle={goalTitle} configured={AI_CONFIGURED} />}
        {tab === "plan" && <CareerPlanTab initialPlans={plans} />}
        {tab === "resume" && <ResumeReviewTab latest={latestReview} />}
        {tab === "interview" && <InterviewPrepTab />}
      </div>
    </div>
  );
}
