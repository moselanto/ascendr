import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { initials } from "@/lib/people";

export const dynamic = "force-dynamic";

/**
 * Global search across people, communities and career roles. One box in the
 * top bar, one results page, three clear groups.
 */
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const me = await getCurrentProfile();
  const supabase = createClient();
  const like = `%${q.replace(/[%,()]/g, "")}%`;

  const [people, communities, roles] = q
    ? await Promise.all([
        supabase.from("profiles").select("id, full_name, role, bio, verified_expert").neq("id", me?.id ?? "").or(`full_name.ilike.${like},bio.ilike.${like}`).limit(12),
        supabase.from("communities").select("id, slug, name, description, member_count").eq("visibility", "public").or(`name.ilike.${like},description.ilike.${like}`).limit(8),
        supabase.from("role_profiles").select("id, title").ilike("title", like).limit(8),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const P = (people.data ?? []) as { id: string; full_name: string | null; role: string; bio: string | null; verified_expert: boolean | null }[];
  const C = (communities.data ?? []) as { id: string; slug: string; name: string; description: string | null; member_count: number | null }[];
  const Rl = (roles.data ?? []) as { id: string; title: string }[];
  const total = P.length + C.length + Rl.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Search</p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
          Find people, communities <span className="accent-serif">and roles.</span>
        </h1>
      </div>

      <form action="/app/search" role="search" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Try \u201cproduct\u201d, a name, or a company"
          aria-label="Search"
          className="w-full rounded-full border border-border bg-white px-5 py-3 text-[15px] text-ink shadow-card outline-none focus:border-ink/30"
        />
        <button className="rounded-full bg-ink px-5 text-[14px] font-medium text-white hover:bg-ink-700">Search</button>
      </form>

      {q === "" ? (
        <p className="text-[14px] text-text-secondary">Search by name, skill words in bios, company names, community topics or a target role.</p>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="text-[15px] font-semibold text-ink">Nothing matches \u201c{q}\u201d</p>
          <p className="mt-1 text-[14px] text-text-secondary">Try a shorter word, or browse mentors and communities directly.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/app/mentors" className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">Browse mentors</Link>
            <Link href="/app/communities" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40">Browse communities</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Rl.length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-ink">Career roles</h2>
              <div className="flex flex-wrap gap-2">
                {Rl.map((r) => (
                  <Link key={r.id} href="/onboarding" className="rounded-full border border-border bg-white px-4 py-2 text-[13px] font-medium capitalize text-ink shadow-card hover:border-ink/30">
                    {r.title} <span className="text-text-secondary">\u00b7 set as goal</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {P.length > 0 && (
            <section className="rounded-2xl border border-border bg-white shadow-card">
              <h2 className="border-b border-border px-5 py-3.5 text-[15px] font-semibold text-ink">People</h2>
              <ul className="divide-y divide-border">
                {P.map((p) => (
                  <li key={p.id}>
                    <Link href={`/app/members/${p.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface/60">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">{initials(p.full_name)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink">
                          {p.full_name ?? "Member"}
                          {p.verified_expert ? <span className="ml-2 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Verified</span> : null}
                        </p>
                        <p className="truncate text-[12px] text-text-secondary">{p.bio ?? (p.role === "mentor" ? "Mentor" : "Member")}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {C.length > 0 && (
            <section className="rounded-2xl border border-border bg-white shadow-card">
              <h2 className="border-b border-border px-5 py-3.5 text-[15px] font-semibold text-ink">Communities</h2>
              <ul className="divide-y divide-border">
                {C.map((c) => (
                  <li key={c.id}>
                    <Link href={`/app/communities/${c.slug}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface/60">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">{initials(c.name)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink">{c.name}</p>
                        <p className="truncate text-[12px] text-text-secondary">{c.description ?? `${c.member_count ?? 0} members`}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
