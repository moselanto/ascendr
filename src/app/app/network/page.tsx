import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { initials } from "@/lib/people";
import {
  createOrganization,
  createInvite,
  revokeInvite,
  addOrgRole,
  removeOrgRole,
  removeOrgMember,
  setSharing,
  leaveOrganization,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * ASCENDR Networks - the B2B surface (prototype "Network intelligence").
 *
 * Admin view: overview metrics, invites, the network's open roles, the
 * readiness map (ready now / within 90 days / developing per role), skill
 * supply vs demand, and the member list. All member data arrives through
 * SECURITY DEFINER functions that check is_org_admin() and respect each
 * member's share_career_data flag (migration 0013).
 *
 * Member view: what the organisation can see, a sharing switch, and leave.
 */

type OrgRow = { organization_id: string; role: string; share_career_data: boolean; organizations: unknown };
type Org = { id: string; name: string; kind: string; role: string; share: boolean };
type Overview = { members: number; sharing: number; activated: number; acted_7d: number; outcomes_90d: number; interviews_90d: number; hires_90d: number; intros_90d: number };
type Readiness = { org_role_id: string; role_title: string; company: string; openings: number; member_id: string; member_name: string | null; band: string; matched: number; essential: number; missing: string[] | null; goal_match: boolean };
type Supply = { skill_id: string; skill: string; demand: number; have: number; learning: number };
type MemberRow = { user_id: string; full_name: string | null; role: string; share_career_data: boolean; joined_at: string; goal_title: string | null };

const KIND_LABEL: Record<string, string> = {
  vc_fund: "VC fund",
  accelerator: "Accelerator",
  university: "University",
  association: "Association",
  company: "Company",
  other: "Network",
};

const BANDS = [
  { key: "strong", label: "Ready now", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-800" },
  { key: "partial", label: "Within 90 days", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800" },
  { key: "stretch", label: "Developing", dot: "bg-brand-400", chip: "bg-brand-50 text-brand-700" },
] as const;

function pct(n: number, d: number) {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : "\u2013";
}

function MigrationNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-[14px] leading-relaxed text-amber-900">
      <p className="font-semibold">ASCENDR Networks needs one database update.</p>
      <p className="mt-1">
        Run <code className="rounded bg-white/70 px-1.5 py-0.5">supabase/migrations/0013_networks.sql</code> in the Supabase SQL editor, then refresh this page.
      </p>
    </div>
  );
}

export default async function NetworkPage({ searchParams }: { searchParams: { org?: string } }) {
  const profile = await getCurrentProfile();
  const me = profile?.id ?? "";
  const supabase = createClient();

  const mine = await supabase
    .from("organization_members")
    .select("organization_id, role, share_career_data, organizations:organization_id(id, name, kind)")
    .eq("user_id", me);

  const head = (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Network intelligence</p>
      <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
        Your network is a <span className="accent-serif">growth engine.</span>
      </h1>
    </div>
  );

  if (mine.error) {
    return (
      <div className="space-y-6">
        {head}
        <MigrationNotice />
      </div>
    );
  }

  const orgs: Org[] = ((mine.data ?? []) as OrgRow[])
    .map((r) => {
      const raw = r.organizations;
      const o = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string; kind: string } | null;
      return o ? { id: o.id, name: o.name, kind: o.kind, role: r.role, share: r.share_career_data } : null;
    })
    .filter(Boolean) as Org[];

  /* ------------------------------------------------ no organisation yet */
  if (orgs.length === 0) {
    return (
      <div className="space-y-6">
        {head}
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="relative overflow-hidden rounded-2xl bg-ink p-7 text-white">
            <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
            <div className="relative">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">For funds, accelerators and universities</p>
              <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight">
                See who in your network is ready for the roles you need, and grow the rest.
              </h2>
              <ul className="mt-5 space-y-2 text-[14px] text-white/75">
                <li>Invite members with one link</li>
                <li>Add the roles your portfolio is hiring for</li>
                <li>Get a readiness map: ready now, within 90 days, developing</li>
                <li>Track intros, interviews and hires from inside the network</li>
              </ul>
              <Link href="/networks" className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-[13px] font-medium text-ink hover:bg-brand-50">
                See the interactive demo
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
            <h2 className="text-[16px] font-semibold text-ink">Create your network</h2>
            <p className="mt-1 text-[13px] text-text-secondary">You become its admin. Members join by invite link and choose what they share.</p>
            <form action={createOrganization} className="mt-5 space-y-3">
              <label className="block text-[12px] font-medium text-text-secondary">
                Name
                <input name="name" required minLength={2} maxLength={120} placeholder="e.g. Northstar Ventures" className="mt-1 block w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink" />
              </label>
              <label className="block text-[12px] font-medium text-text-secondary">
                Type
                <select name="kind" className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-ink">
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <button className="w-full rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-white hover:bg-ink-700">Create network</button>
            </form>
            <p className="mt-4 text-[12px] text-text-secondary">Joining someone else&apos;s network? Open the invite link they sent you.</p>
          </section>
        </div>
      </div>
    );
  }

  const current = orgs.find((o) => o.id === searchParams.org) ?? orgs.find((o) => o.role === "admin") ?? orgs[0];
  const switcher =
    orgs.length > 1 ? (
      <div className="flex flex-wrap gap-1.5">
        {orgs.map((o) => (
          <Link
            key={o.id}
            href={`/app/network?org=${o.id}`}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${o.id === current.id ? "bg-ink text-white" : "border border-border bg-white text-text-secondary hover:text-ink"}`}
          >
            {o.name}
          </Link>
        ))}
      </div>
    ) : null;

  /* ------------------------------------------------ member view */
  if (current.role !== "admin") {
    return (
      <div className="space-y-6">
        {head}
        {switcher}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{KIND_LABEL[current.kind] ?? "Network"}</p>
          <h2 className="mt-1 text-[22px] font-semibold text-ink">You&apos;re part of {current.name}</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-secondary">
            When sharing is on, {current.name}&apos;s admins can see your goal, your readiness band for the roles they are hiring for, the skills
            you&apos;re missing, and the outcomes you log. They never see your messages or private notes.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={setSharing}>
              <input type="hidden" name="org" value={current.id} />
              <input type="hidden" name="share" value={current.share ? "0" : "1"} />
              <button className={`rounded-full px-4 py-2 text-[13px] font-medium ${current.share ? "border border-ink/15 text-ink hover:border-ink/40" : "bg-ink text-white hover:bg-ink-700"}`}>
                {current.share ? "Stop sharing my career data" : "Share my career data"}
              </button>
            </form>
            <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${current.share ? "bg-emerald-50 text-emerald-800" : "bg-surface text-text-secondary"}`}>
              Sharing is {current.share ? "on" : "off"}
            </span>
            <form action={leaveOrganization} className="ml-auto">
              <input type="hidden" name="org" value={current.id} />
              <button className="text-[13px] text-text-secondary hover:text-danger">Leave network</button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  /* ------------------------------------------------ admin view */
  const [ovRes, memRes, readyRes, supplyRes, invRes, rolesRes, catalogRes] = await Promise.all([
    supabase.rpc("org_overview", { p_org: current.id }),
    supabase.rpc("org_members_list", { p_org: current.id }),
    supabase.rpc("org_readiness", { p_org: current.id }),
    supabase.rpc("org_skill_supply", { p_org: current.id }),
    supabase.from("organization_invites").select("id, code, label, uses, expires_at").eq("organization_id", current.id).order("created_at", { ascending: false }),
    supabase.from("organization_roles").select("id, company, openings, role_profiles:role_profile_id(title)").eq("organization_id", current.id).order("created_at", { ascending: false }),
    supabase.from("role_profiles").select("id, title").order("title").limit(200),
  ]);

  const ov = ((ovRes.data ?? [])[0] ?? { members: 0, sharing: 0, activated: 0, acted_7d: 0, outcomes_90d: 0, interviews_90d: 0, hires_90d: 0, intros_90d: 0 }) as Overview;
  const members = (memRes.data ?? []) as MemberRow[];
  const readiness = (readyRes.data ?? []) as Readiness[];
  const supply = (supplyRes.data ?? []) as Supply[];
  const invites = (invRes.data ?? []) as { id: string; code: string; label: string | null; uses: number; expires_at: string }[];
  const roles = (rolesRes.data ?? []) as { id: string; company: string; openings: number; role_profiles: unknown }[];
  const catalog = (catalogRes.data ?? []) as { id: string; title: string }[];
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // Group readiness by role; hide "stretch" members who neither target the role nor hold any of its skills.
  const byRole = new Map<string, { title: string; company: string; openings: number; rows: Readiness[] }>();
  readiness.forEach((r) => {
    if (r.band === "unknown") return;
    if (r.band === "stretch" && r.goal_match === false && r.matched === 0) return;
    const g = byRole.get(r.org_role_id) ?? { title: r.role_title, company: r.company, openings: r.openings, rows: [] };
    g.rows.push(r);
    byRole.set(r.org_role_id, g);
  });
  const maxSupply = Math.max(1, ...supply.map((s) => Math.max(s.demand, s.have + s.learning)));

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {head}
        {switcher}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-[13px] font-semibold text-white">{initials(current.name)}</span>
        <div>
          <p className="text-[18px] font-semibold text-ink">{current.name}</p>
          <p className="text-[12px] text-text-secondary">
            {KIND_LABEL[current.kind] ?? "Network"} \u00b7 {ov.members} members \u00b7 {ov.sharing} sharing career data
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
        {[
          { label: "Career activation", value: pct(ov.activated, ov.sharing), note: `${ov.activated} of ${ov.sharing} set a goal` },
          { label: "Action within 7 days", value: pct(ov.acted_7d, ov.sharing), note: `${ov.acted_7d} members acted this week` },
          { label: "Outcomes, last 90 days", value: String(ov.outcomes_90d), note: `${ov.interviews_90d} interviews \u00b7 ${ov.hires_90d} offers or hires` },
          { label: "Introductions, 90 days", value: String(ov.intros_90d), note: "warm paths that happened" },
        ].map((k) => (
          <div key={k.label} className="bg-white p-5">
            <p className="nums text-[28px] font-semibold tracking-tight text-ink">{k.value}</p>
            <p className="text-[13px] font-medium text-ink">{k.label}</p>
            <p className="text-[12px] text-text-secondary">{k.note}</p>
          </div>
        ))}
      </div>

      {/* Readiness map */}
      <section>
        <h2 className="mb-3 text-[17px] font-semibold tracking-tight text-ink">Readiness map</h2>
        {roles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-[13px] text-text-secondary">
            Add the roles your network is hiring for below, and members will be sorted by readiness for each one.
          </div>
        ) : byRole.size === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-[13px] text-text-secondary">
            No members matched yet. Invite members and ask them to set a goal and add their skills.
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(byRole.entries()).map(([id, g]) => (
              <div key={id} className="rounded-2xl border border-border bg-white shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                  <p className="text-[15px] font-semibold text-ink">
                    {g.title} <span className="font-normal text-text-secondary">at {g.company}</span>
                  </p>
                  <div className="flex gap-4 text-[12px]">
                    {BANDS.map((b) => (
                      <span key={b.key} className="flex items-center gap-1.5 text-ink">
                        <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                        <span className="nums font-semibold">{g.rows.filter((r) => r.band === b.key).length}</span>
                        <span className="text-text-secondary">{b.label.toLowerCase()}</span>
                      </span>
                    ))}
                    <span className="text-text-secondary">\u00b7 {g.openings} opening{g.openings === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <div className="grid gap-3 p-4 lg:grid-cols-3">
                  {BANDS.map((b) => {
                    const rows = g.rows.filter((r) => r.band === b.key).sort((x, y) => y.matched - x.matched);
                    return (
                      <div key={b.key} className="rounded-xl bg-surface p-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${b.chip}`}>{b.label}</span>
                        {rows.length === 0 ? (
                          <p className="mt-3 px-1 text-[12px] text-text-secondary">No one yet.</p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {rows.slice(0, 8).map((r) => (
                              <li key={r.member_id} className="rounded-lg bg-white p-3">
                                <Link href={`/app/members/${r.member_id}`} className="text-[13px] font-semibold text-ink hover:underline">
                                  {r.member_name ?? "Member"}
                                </Link>
                                <p className="text-[12px] text-text-secondary">
                                  {r.matched} of {r.essential} core skills{r.goal_match ? " \u00b7 targeting this role" : ""}
                                </p>
                                {(r.missing ?? []).length > 0 && (
                                  <p className="mt-1 text-[12px] text-ink/70">Missing: {(r.missing ?? []).slice(0, 3).join(", ")}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Skill supply vs demand */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Skill supply vs network demand</h2>
            <p className="text-[13px] text-text-secondary">Demand = openings needing the skill. Supply = sharing members who have it, plus those working on it.</p>
          </div>
          <div className="flex gap-4 text-[12px] text-text-secondary">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-lg bg-ink" />Have it</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-lg bg-ink/25" />Learning</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-danger" />Needed</span>
          </div>
        </div>
        {supply.length === 0 ? (
          <p className="mt-5 text-[13px] text-text-secondary">Appears once you add open roles.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {supply.map((s) => {
              const short = s.have < s.demand;
              const tot = s.have + s.learning;
              return (
                <li key={s.skill_id} className="grid grid-cols-[130px_1fr] items-center gap-4 sm:grid-cols-[200px_1fr_130px]">
                  <span className="truncate text-[13px] font-medium text-ink">{s.skill}</span>
                  <div className="relative h-3 rounded-full bg-surface">
                    <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-full" style={{ width: `${(tot / maxSupply) * 100}%` }}>
                      <div className="h-full bg-ink" style={{ width: `${tot ? (s.have / tot) * 100 : 0}%` }} />
                      <div className="h-full flex-1 bg-ink/25" />
                    </div>
                    <span aria-hidden className="absolute -top-1 h-5 w-0.5 bg-danger" style={{ left: `${(s.demand / maxSupply) * 100}%` }} />
                  </div>
                  <span className={`col-span-2 text-[12px] sm:col-span-1 sm:text-right ${short ? "text-danger" : "text-emerald-700"}`}>
                    {short ? `Short by ${s.demand - s.have}` : "Covered"} \u00b7 {s.have}/{s.demand}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Open roles */}
        <section className="rounded-2xl border border-border bg-white shadow-card">
          <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-ink">Roles your network is hiring for</h2>
          {roles.length > 0 && (
            <ul className="divide-y divide-border">
              {roles.map((r) => {
                const raw = r.role_profiles;
                const rp = (Array.isArray(raw) ? raw[0] : raw) as { title?: string } | null;
                return (
                  <li key={r.id} className="flex items-center gap-3 px-6 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{rp?.title ?? "Role"}</p>
                      <p className="text-[12px] text-text-secondary">
                        {r.company} \u00b7 {r.openings} opening{r.openings === 1 ? "" : "s"}
                      </p>
                    </div>
                    <form action={removeOrgRole}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-[12px] text-text-secondary hover:text-danger">Remove</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
          <form action={addOrgRole} className="grid gap-2 border-t border-border p-5 sm:grid-cols-[1.4fr_1fr_80px_auto] sm:items-end">
            <input type="hidden" name="org" value={current.id} />
            <label className="text-[12px] font-medium text-text-secondary">
              Role
              <select name="role_profile_id" required className="mt-1 block w-full rounded-lg border border-border bg-white px-2.5 py-2 text-[13px] text-ink">
                {catalog.length === 0 ? <option value="">Run the skills import first</option> : null}
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-medium text-text-secondary">
              Company
              <input name="company" required maxLength={120} placeholder="Portfolio company" className="mt-1 block w-full rounded-lg border border-border px-2.5 py-2 text-[13px] text-ink" />
            </label>
            <label className="text-[12px] font-medium text-text-secondary">
              Openings
              <input name="openings" type="number" min={1} max={500} defaultValue={1} className="mt-1 block w-full rounded-lg border border-border px-2.5 py-2 text-[13px] text-ink" />
            </label>
            <button className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-700">Add role</button>
          </form>
        </section>

        {/* Invites */}
        <section className="rounded-2xl border border-border bg-white shadow-card">
          <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-ink">Invite members</h2>
          <form action={createInvite} className="flex gap-2 px-6 pt-5">
            <input type="hidden" name="org" value={current.id} />
            <input name="label" maxLength={80} placeholder="Label, e.g. Portfolio founders" className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px] text-ink" />
            <button className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-700">Create link</button>
          </form>
          <p className="px-6 pt-2 text-[12px] text-text-secondary">Links last 30 days. Anyone with the link can join, so share it with your members directly.</p>
          {invites.length === 0 ? (
            <p className="px-6 py-6 text-[13px] text-text-secondary">No invite links yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {invites.map((i) => {
                const expired = new Date(i.expires_at).getTime() < Date.now();
                return (
                  <li key={i.id} className="space-y-2 px-6 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-ink">{i.label || "Invite link"}</p>
                      <span className="text-[12px] text-text-secondary">
                        {expired ? "Expired" : `${i.uses} joined`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={`${origin}/app/network/join?code=${i.code}`}
                        aria-label="Invite link"
                        className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[12px] text-ink"
                      />
                      <form action={revokeInvite}>
                        <input type="hidden" name="id" value={i.id} />
                        <button className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-text-secondary hover:text-danger">Revoke</button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Members */}
      <section className="rounded-2xl border border-border bg-white shadow-card">
        <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-ink">Members</h2>
        {members.length === 0 ? (
          <p className="px-6 py-6 text-[13px] text-text-secondary">No members yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-6 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">{initials(m.full_name)}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/app/members/${m.user_id}`} className="text-[14px] font-medium text-ink hover:underline">
                    {m.full_name ?? "Member"}
                  </Link>
                  <p className="text-[12px] text-text-secondary">
                    {m.share_career_data ? (m.goal_title ? `Goal: ${m.goal_title}` : "No goal set yet") : "Not sharing career data"}
                  </p>
                </div>
                {m.role === "admin" ? (
                  <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium text-white">Admin</span>
                ) : (
                  <form action={removeOrgMember}>
                    <input type="hidden" name="org" value={current.id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button className="text-[12px] text-text-secondary hover:text-danger">Remove</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
