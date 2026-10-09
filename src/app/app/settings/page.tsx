import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

/**
 * My profile: identity, headline bio and career intent, plus shortcuts to the
 * goal and skills that drive ASCENDR's recommendations.
 */
export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const me = await getCurrentProfile();
  const supabase = createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("full_name, handle, bio, career_goal, target_roles, role, verified_expert")
    .eq("id", me?.id ?? "")
    .maybeSingle();
  const { data: goal } = await supabase
    .from("career_goals")
    .select("target_title, horizon_months")
    .eq("user_id", me?.id ?? "")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count: skillCount } = await supabase.from("user_skills").select("skill_id", { count: "exact", head: true }).eq("user_id", me?.id ?? "");

  const roles = Array.isArray(p?.target_roles) ? (p?.target_roles as string[]).join(", ") : "";
  const input = "mt-1 block w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/30";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">My profile</p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
          How the network <span className="accent-serif">sees you.</span>
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">A clear profile makes your matches, introductions and recommendations better.</p>
      </div>

      {searchParams.saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-[14px] text-emerald-800">Profile saved.</div>
      ) : null}
      {searchParams.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[14px] text-danger">Could not save: {searchParams.error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <h2 className="text-[16px] font-semibold text-ink">Profile details</h2>
          <form action={updateProfile} className="mt-5 space-y-4">
            <label className="block text-[12px] font-medium text-text-secondary">
              Full name
              <input name="full_name" defaultValue={p?.full_name ?? ""} maxLength={120} className={input} />
            </label>
            <label className="block text-[12px] font-medium text-text-secondary">
              Handle
              <input name="handle" defaultValue={p?.handle ? `@${p.handle}` : ""} maxLength={40} placeholder="@yourname" className={input} />
            </label>
            <label className="block text-[12px] font-medium text-text-secondary">
              About you
              <textarea
                name="bio"
                defaultValue={p?.bio ?? ""}
                rows={4}
                maxLength={600}
                placeholder="Your current role, company and what you are working towards. Mentioning companies helps ASCENDR find warm paths."
                className={input}
              />
            </label>
            <label className="block text-[12px] font-medium text-text-secondary">
              What you are working towards
              <select name="career_goal" defaultValue={p?.career_goal ?? ""} className={`${input} bg-white`}>
                <option value="">Choose one</option>
                <option value="switch">Switch careers</option>
                <option value="promote">Get promoted</option>
                <option value="startup">Start a company</option>
                <option value="learn">Learn and grow</option>
              </select>
            </label>
            <label className="block text-[12px] font-medium text-text-secondary">
              Roles you are interested in (comma separated)
              <input name="target_roles" defaultValue={roles} maxLength={300} placeholder="Product Manager, Product Analyst" className={input} />
            </label>
            <button className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">Save profile</button>
          </form>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
            <h2 className="text-[16px] font-semibold text-ink">Career goal</h2>
            <p className="mt-2 text-[14px] text-text-secondary">
              {goal ? `${goal.target_title ?? "Goal set"}${goal.horizon_months ? `, within ${goal.horizon_months} months` : ""}` : "No goal set yet."}
            </p>
            <Link href="/onboarding" className="mt-4 inline-flex rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40">
              {goal ? "Change goal" : "Set my goal"}
            </Link>
          </section>
          <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
            <h2 className="text-[16px] font-semibold text-ink">Skills</h2>
            <p className="mt-2 text-[14px] text-text-secondary">{skillCount ?? 0} skills on your profile.</p>
            <Link href="/app/career" className="mt-4 inline-flex rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40">
              Manage skills
            </Link>
          </section>
          <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
            <h2 className="text-[16px] font-semibold text-ink">Privacy</h2>
            <p className="mt-2 text-[14px] text-text-secondary">
              Network admins only see your career data while sharing is on. Change it per network.
            </p>
            <Link href="/app/network" className="mt-4 inline-flex rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40">
              Network sharing
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
