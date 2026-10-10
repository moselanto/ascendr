import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SIGNUP } from "@/components/home/links";

type Role = { id: string; title: string; description: string | null };
type Req = { importance: string; weight: number | null; skills: unknown };

function labelOf(s: unknown): string | null {
  if (Array.isArray(s)) return (s[0] as { preferred_label?: string } | undefined)?.preferred_label ?? null;
  return (s as { preferred_label?: string } | null)?.preferred_label ?? null;
}

function cap(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * "See what it takes": a public, no-signup preview of real role requirements
 * from the Career Graph (ESCO). Renders nothing until roles are seeded, so the
 * homepage never shows an empty or invented section.
 */
export async function RoleExplorer({ selected }: { selected?: string }) {
  let roles: Role[] = [];
  let reqs: Req[] = [];
  let role: Role | undefined;
  try {
    const supabase = createClient();
    const { data } = await supabase.from("role_profiles").select("id, title, description").order("title");
    roles = (data ?? []) as Role[];
    role = roles.find((r) => r.id === selected) ?? roles[0];
    if (role) {
      const { data: rq } = await supabase
        .from("role_required_skills")
        .select("importance, weight, skills(preferred_label)")
        .eq("role_id", role.id)
        .order("weight", { ascending: false });
      reqs = (rq ?? []) as unknown as Req[];
    }
  } catch {
    return null;
  }
  if (role == null || reqs.length === 0) return null;

  const essential = reqs
    .filter((r) => r.importance === "essential")
    .map((r) => labelOf(r.skills))
    .filter((l): l is string => Boolean(l));
  const optionalCount = reqs.filter((r) => r.importance === "optional").length;
  const shown = essential.slice(0, 14);

  return (
    <section id="explore" className="scroll-mt-20 bg-surface px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Explore a role</p>
        <h2 className="mt-2 text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink md:text-[38px]">
          See what it <span className="accent-serif">really takes</span>
        </h2>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-text-secondary">
          Real skill requirements from the European Commission&apos;s ESCO career framework. Pick a role to see what
          employers expect, then let ASCENDR measure your gap.
        </p>

        <div className="mt-7 flex flex-wrap gap-2">
          {roles.map((r) => {
            const on = r.id === role?.id;
            return (
              <Link
                key={r.id}
                href={`/?role=${r.id}#explore`}
                scroll={false}
                className={
                  on
                    ? "rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white"
                    : "rounded-full border border-border bg-white px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40"
                }
              >
                {cap(r.title)}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-card md:p-7">
            <h3 className="text-[22px] font-semibold tracking-tight text-ink">{cap(role.title)}</h3>
            {role.description && (
              <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-text-secondary">{role.description}</p>
            )}
            <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Essential skills</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {shown.map((l) => (
                <li key={l} className="rounded-full bg-brand-50 px-3 py-1.5 text-[13px] text-brand-700">
                  {l}
                </li>
              ))}
            </ul>
            {essential.length > shown.length && (
              <p className="mt-3 text-[13px] text-text-secondary">+{essential.length - shown.length} more essential skills</p>
            )}
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white">
            <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
            <div className="relative">
              <p className="text-[40px] font-semibold leading-none tracking-tight">{essential.length}</p>
              <p className="mt-1 text-[14px] text-white/70">essential skills</p>
              <p className="mt-4 text-[24px] font-semibold leading-none">{optionalCount}</p>
              <p className="mt-1 text-[14px] text-white/70">nice-to-have skills</p>
              <p className="mt-5 text-[14px] leading-relaxed text-white/75">
                How many do you already have? Set this as your goal and ASCENDR shows your exact gap, the next step,
                and who can help.
              </p>
              <Link
                href={SIGNUP}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-brand-50"
              >
                Check my gap <span aria-hidden>{"\u2192"}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
