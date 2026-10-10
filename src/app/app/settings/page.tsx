import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { updateProfile } from "./actions";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";

// Mirrors VALID_GOALS in ./actions.ts.
const GOAL_OPTIONS: { value: string; label: string }[] = [
  { value: "switch", label: "Switch careers" },
  { value: "promote", label: "Get promoted" },
  { value: "startup", label: "Start a company" },
  { value: "learn", label: "Learn new skills" },
];

type ProfileWithGoals = Profile & {
  career_goal?: string | null;
  target_roles?: string[] | null;
  headline?: string | null;
  company?: string | null;
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

const card = "rounded-2xl border border-border bg-white p-5 shadow-card md:p-6";
const label = "block text-[12px] font-medium text-text-secondary";
const input =
  "mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40";
const sectionEyebrow = "text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600";
const secondaryBtn =
  "inline-block rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const base = await getCurrentProfile();
  if (!base) redirect("/login");
  const profile = base as ProfileWithGoals;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goal } = await supabase
    .from("career_goals")
    .select("id, kind, target_title, horizon_months")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: skillCount } = await supabase
    .from("user_skills")
    .select("skill_id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  const targetRoles = Array.isArray(profile.target_roles) ? profile.target_roles : [];
  const goalLabel = GOAL_OPTIONS.find((g) => g.value === profile.career_goal)?.label ?? null;
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Page head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Settings</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            My <span className="accent-serif">profile</span>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            How you appear to the community, and what ASCENDR uses to guide you.
          </p>
        </div>
        <Link
          href={`/app/members/${profile.id}`}
          className="self-start rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40 md:self-auto"
        >
          View public profile →
        </Link>
      </div>

      {searchParams.saved && (
        <div className="mt-5 rounded-2xl border border-border bg-emerald-50 px-5 py-3 text-[14px] text-emerald-800">
          ✓ Your profile was saved.
        </div>
      )}
      {searchParams.error && (
        <div className="mt-5 rounded-2xl border border-border bg-white px-5 py-3 text-[14px] text-danger">
          Could not save your profile: {searchParams.error}
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Profile details */}
        <form action={updateProfile} className={card}>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-[15px] font-semibold text-brand-700">
              {initials(profile.full_name)}
            </span>
            <div className="min-w-0">
              <p className={sectionEyebrow}>Profile details</p>
              <p className="mt-0.5 truncate text-[17px] font-semibold text-ink">
                {profile.full_name || "Add your name"}
              </p>
              <p className="truncate text-[13px] text-text-secondary">
                {profile.handle ? `@${profile.handle}` : "No handle yet"} · <span className="capitalize">{profile.role}</span>
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="full_name" className={label}>Full name</label>
              <input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} placeholder="Your name" className={input} />
            </div>
            <div>
              <label htmlFor="handle" className={label}>Handle</label>
              <input id="handle" name="handle" defaultValue={profile.handle ?? ""} placeholder="@yourname" className={input} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="headline" className={label}>Headline</label>
              <input id="headline" name="headline" maxLength={120} defaultValue={profile.headline ?? ""} placeholder="Product analyst moving into product management" className={input} />
            </div>
            <div>
              <label htmlFor="company" className={label}>Current company</label>
              <input id="company" name="company" maxLength={80} defaultValue={profile.company ?? ""} placeholder="Where you work today" className={input} />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="bio" className={label}>Bio</label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={profile.bio ?? ""}
              placeholder="A sentence or two about what you do and where you're headed."
              className={input}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="career_goal" className={label}>Career focus</label>
              <select id="career_goal" name="career_goal" defaultValue={profile.career_goal ?? ""} className={`${input} bg-white`}>
                <option value="">Not set</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="target_roles" className={label}>Target roles</label>
              <input
                id="target_roles"
                name="target_roles"
                defaultValue={targetRoles.join(", ")}
                placeholder="Product Manager, UX Researcher"
                className={input}
              />
              <p className="mt-1 text-[12px] text-text-secondary">Separate with commas, up to 10.</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
            <button
              type="submit"
              className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
            >
              Save profile
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-5">
          {/* Career goal summary */}
          <div className={card}>
            <p className={sectionEyebrow}>Career goal</p>
            {goal ? (
              <>
                <p className="mt-1.5 text-[16px] font-semibold text-ink">{goal.target_title || "Goal set"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {goalLabel && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700">{goalLabel}</span>
                  )}
                  {goal.horizon_months ? (
                    <span className="rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-text-secondary">
                      {goal.horizon_months} months
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-[14px] text-text-secondary">
                {goalLabel ? `Focus: ${goalLabel}. ` : ""}No destination set yet. A goal powers your gap analysis and roadmap.
              </p>
            )}
            {targetRoles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {targetRoles.map((r) => (
                  <span key={r} className="rounded-full border border-border bg-white px-2.5 py-1 text-[12px] text-ink">{r}</span>
                ))}
              </div>
            )}
            <Link href="/onboarding" className={`mt-4 ${secondaryBtn}`}>
              {goal ? "Change goal →" : "Set my goal →"}
            </Link>
          </div>

          {/* Skills summary */}
          <div className={card}>
            <p className={sectionEyebrow}>Skills</p>
            <div className="mt-1.5 flex items-end gap-2">
              <span className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink">{skillCount ?? 0}</span>
              <span className="mb-0.5 text-[13px] text-text-secondary">skills on your profile</span>
            </div>
            <p className="mt-2 text-[13px] text-text-secondary">
              Add or remove skills from your gap analysis to keep recommendations honest.
            </p>
            <Link href="/app/career" className={`mt-4 ${secondaryBtn}`}>
              Manage skills →
            </Link>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="mt-5 rounded-2xl border border-border bg-white p-0 shadow-card">
        <div className="px-5 py-4">
          <p className={sectionEyebrow}>Privacy</p>
          <p className="mt-1 text-[14px] text-text-secondary">What other members can and cannot see.</p>
        </div>
        <ul className="divide-y divide-border border-t border-border">
          <li className="flex items-start justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-[14px] font-medium text-ink">Public profile</p>
              <p className="text-[13px] text-text-secondary">Your name, handle, role and bio are visible to signed-in members.</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-800">Visible</span>
          </li>
          <li className="flex items-start justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-[14px] font-medium text-ink">Career goal &amp; skills</p>
              <p className="text-[13px] text-text-secondary">Used to personalise your coach and roadmap. Not shown on your public profile.</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold text-text-secondary">Private</span>
          </li>
          <li className="flex items-start justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-[14px] font-medium text-ink">Direct messages</p>
              <p className="text-[13px] text-text-secondary">Only you and the person you message can read a conversation.</p>
            </div>
            <Link href="/app/networking" className="shrink-0 text-[13px] font-medium text-ink hover:text-brand-700">
              Network →
            </Link>
          </li>
        </ul>
      </div>

      {/* Account */}
      <div className="mt-5 rounded-2xl border border-border bg-white p-0 shadow-card">
        <div className="px-5 py-4">
          <p className={sectionEyebrow}>Account</p>
        </div>
        <dl className="divide-y divide-border border-t border-border">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="text-[13px] text-text-secondary">Email</dt>
            <dd className="truncate text-[14px] font-medium text-ink">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="text-[13px] text-text-secondary">Account type</dt>
            <dd className="flex items-center gap-2 text-[14px] font-medium capitalize text-ink">
              {profile.role.replace("_", " ")}
              {profile.verified_expert && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold normal-case text-brand-700">✓ Verified expert</span>
              )}
            </dd>
          </div>
          {memberSince && (
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="text-[13px] text-text-secondary">Member since</dt>
              <dd className="text-[14px] font-medium text-ink">{memberSince}</dd>
            </div>
          )}
        </dl>
        <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
          <p className="text-[13px] text-text-secondary">Signed in on this device</p>
          <form action={signOut}>
            <button className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-danger/40 hover:text-danger">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
