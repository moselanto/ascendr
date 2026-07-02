import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { completeOnboarding } from "./actions";

export const dynamic = "force-dynamic";

const GOALS = [
  { id: "switch", emoji: "🚀", title: "Switch careers", sub: "Move into a new field or role" },
  { id: "promote", emoji: "📈", title: "Get promoted", sub: "Grow in my current track" },
  { id: "startup", emoji: "🧭", title: "Build a startup", sub: "Founder & growth mentoring" },
  { id: "learn", emoji: "🎓", title: "Learn a skill", sub: "Courses, paths & certificates" },
];

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <main className="min-h-screen bg-[#EEF1F6] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-[1100px] grid md:grid-cols-2 rounded-lg overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,.10)] bg-card">
        {/* Left panel */}
        <div className="hidden md:flex flex-col p-12 text-white bg-gradient-to-br from-primary to-dark-bg">
          <div className="text-2xl font-black">
            ASCEND<span className="text-[#a5b4fc]">R</span>
          </div>
          <div className="mt-auto">
            <span className="inline-block text-caption font-semibold rounded-full px-3 py-1 bg-white/15">
              Step 2 of 4
            </span>
            <h1 className="text-h2 font-extrabold leading-tight mt-4 mb-2.5">
              Let&apos;s set your career goal
            </h1>
            <p className="text-[#c7d2fe] text-small max-w-sm">
              Your goal shapes everything — the mentors we match, the AI coach&apos;s plan, and the
              communities we suggest. You can change it anytime.
            </p>
            <div className="flex gap-2 mt-7">
              <i className="w-9 h-1.5 rounded-full bg-white/90" />
              <i className="w-9 h-1.5 rounded-full bg-white" />
              <i className="w-9 h-1.5 rounded-full bg-white/30" />
              <i className="w-9 h-1.5 rounded-full bg-white/30" />
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <form action={completeOnboarding} className="p-8 md:p-11 flex flex-col bg-card">
          <div className="text-small font-bold uppercase tracking-wide text-text-secondary">
            What do you want to achieve?
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3.5">
            {GOALS.map((g, i) => (
              <label
                key={g.id}
                className="rounded-md border border-border bg-card p-4 cursor-pointer transition
                  has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-[#eef2ff]"
              >
                <input
                  type="radio"
                  name="career_goal"
                  value={g.id}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                <div className="text-[22px]">{g.emoji}</div>
                <div className="font-bold mt-1.5">{g.title}</div>
                <div className="text-text-secondary text-small">{g.sub}</div>
              </label>
            ))}
          </div>

          <div className="text-small font-bold uppercase tracking-wide text-text-secondary mt-6">
            Target role{" "}
            <span className="font-medium normal-case">(optional)</span>
          </div>
          <input
            name="target_roles"
            placeholder="e.g. Product Manager, UX Design"
            className="mt-2.5 w-full rounded-full border border-border bg-bg px-4 py-2.5 text-small text-text
              placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
          <p className="text-caption text-text-secondary mt-2">
            Separate multiple roles with commas.
          </p>

          <div className="mt-auto flex gap-3 pt-7">
            <a
              href="/app"
              className="rounded-sm border border-border bg-card px-5 py-3 font-semibold text-small text-text"
            >
              Back
            </a>
            <button
              type="submit"
              className="flex-1 rounded-sm bg-primary px-5 py-3 font-semibold text-small text-white text-center"
            >
              Continue →
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
