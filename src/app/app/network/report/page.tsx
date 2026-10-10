import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { PrintButton } from "./PrintButton";

/**
 * Network impact report: a one-page, printable summary a network admin can
 * send to their partners, donors or board. Every number comes from the
 * network's own data (migrations 0013 and 0016); nothing is estimated.
 */

type Overview = { members: number; sharing: number; activated: number; acted_7d: number; outcomes_90d: number; interviews_90d: number; hires_90d: number; intros_90d: number };
type Readiness = { org_role_id: string; role_title: string; company: string; member_id: string; band: string };
type Trend = { captured_on: string; strong: number; partial: number; stretch: number };
type Pipe = { kind: "pathway" | "intro"; id: string; member_name: string | null; role_title: string; company: string; status: string; updated_at: string };

function pct(n: number, d: number) {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : "n/a";
}

export default async function NetworkReportPage(props: { searchParams: Promise<{ org?: string }> }) {
  const searchParams = await props.searchParams;
  const profile = await getCurrentProfile();
  if (profile == null) redirect("/login");
  const org = String(searchParams.org ?? "");
  if (org.length === 0) redirect("/app/network");
  const supabase = createClient();

  const { data: me } = await supabase
    .from("organization_members")
    .select("role, organizations:organization_id(name, kind)")
    .eq("organization_id", org)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (me == null || me.role !== "admin") redirect("/app/network");
  const rawOrg = (me as unknown as { organizations: unknown }).organizations;
  const orgInfo = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as { name: string; kind: string } | null;

  const [ovRes, readyRes, trendRes, pipeRes] = await Promise.all([
    supabase.rpc("org_overview", { p_org: org }),
    supabase.rpc("org_readiness", { p_org: org }),
    supabase.rpc("org_readiness_trend", { p_org: org }),
    supabase.rpc("org_pipeline", { p_org: org }),
  ]);
  const ov = ((ovRes.data ?? [])[0] ?? { members: 0, sharing: 0, activated: 0, acted_7d: 0, outcomes_90d: 0, interviews_90d: 0, hires_90d: 0, intros_90d: 0 }) as Overview;
  const readiness = (readyRes.data ?? []) as Readiness[];
  const trend = (trendRes.data ?? []) as Trend[];
  const pipeline = (pipeRes.data ?? []) as Pipe[];

  const strong = readiness.filter((r) => r.band === "strong").length;
  const partial = readiness.filter((r) => r.band === "partial").length;
  const firstT = trend[0];
  const lastT = trend[trend.length - 1];
  const hires = pipeline.filter((p) => p.kind === "intro" && p.status === "hired");
  const introsActive = pipeline.filter((p) => p.kind === "intro" && ["consented", "introduced", "interviewing"].includes(p.status)).length;
  const pathwaysAccepted = pipeline.filter((p) => p.kind === "pathway" && p.status === "accepted").length;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const stats: { label: string; value: string; note: string }[] = [
    { label: "Members", value: String(ov.members), note: `${ov.sharing} sharing career data` },
    { label: "Activated", value: pct(ov.activated, ov.members), note: `${ov.activated} set a goal and started their plan` },
    { label: "Active this week", value: pct(ov.acted_7d, ov.members), note: `${ov.acted_7d} took a career action in 7 days` },
    { label: "Ready now", value: String(strong), note: `${partial} more within about 90 days` },
    { label: "Introductions", value: String(ov.intros_90d), note: `${introsActive} in progress, last 90 days` },
    { label: "Interviews", value: String(ov.interviews_90d), note: "Last 90 days" },
    { label: "Hires", value: String(ov.hires_90d), note: "Last 90 days, recorded by the network" },
    { label: "Outcomes logged", value: String(ov.outcomes_90d), note: "Interviews, offers and wins members logged" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16 print:max-w-none print:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/network?org=${org}`} className="text-[13px] text-text-secondary hover:text-ink">
          {"← Back to network"}
        </Link>
        <PrintButton />
      </div>

      <header className="rounded-2xl bg-ink p-7 text-white print:rounded-none">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">Impact report</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em]">{orgInfo?.name ?? "Your network"}</h1>
        <p className="mt-1 text-[14px] text-white/70">Generated on {today} from live ASCENDR data. Members chose to share this information.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-white p-4 shadow-card print:shadow-none">
            <p className="text-[12px] text-text-secondary">{s.label}</p>
            <p className="nums mt-1 text-[26px] font-semibold tracking-tight text-ink">{s.value}</p>
            <p className="mt-1 text-[12px] leading-snug text-text-secondary">{s.note}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-card print:shadow-none">
        <h2 className="text-[16px] font-semibold text-ink">Readiness over time</h2>
        {firstT && lastT && firstT.captured_on !== lastT.captured_on ? (
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            Members ready now for the network&apos;s open roles went from <span className="font-semibold text-ink">{firstT.strong}</span> on{" "}
            {new Date(firstT.captured_on).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} to{" "}
            <span className="font-semibold text-ink">{lastT.strong}</span> on {new Date(lastT.captured_on).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. Those within about
            90 days went from {firstT.partial} to {lastT.partial}.
          </p>
        ) : (
          <p className="mt-2 text-[14px] text-text-secondary">The trend appears after readiness has been recorded on at least two different days.</p>
        )}
        <p className="mt-3 text-[13px] text-text-secondary">{pathwaysAccepted} members accepted a development pathway toward a role the network is hiring for.</p>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-card print:shadow-none">
        <h2 className="text-[16px] font-semibold text-ink">Hires</h2>
        {hires.length === 0 ? (
          <p className="mt-2 text-[14px] text-text-secondary">No hires recorded yet. Hires appear here when an introduction is marked hired.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {hires.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                <span className="font-medium text-ink">{h.member_name ?? "Member"}</span>
                <span className="text-text-secondary">
                  {h.role_title} at {h.company} · {new Date(h.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[12px] leading-relaxed text-text-secondary">
        How these numbers are counted: activated means the member set a career goal; active this week means at least one completed career action in the last 7 days;
        ready now means the member holds every essential skill for a role; hires and interviews are recorded by the network admin and confirmed through member consent.
        Skills data from the European Commission&apos;s ESCO framework.
      </p>
    </div>
  );
}
