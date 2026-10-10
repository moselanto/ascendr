import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { getViewerContext, enrichPeople, conversationStarters, initials } from "@/lib/people";
import { ConnectButton } from "@/components/people/PeopleDirectory";

export const dynamic = "force-dynamic";

/**
 * Member profile. Answers, in order: who is this, why does ASCENDR think
 * they can help me, what do they know, and how do I start the conversation.
 */
export default async function MemberProfile({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const me = await getCurrentProfile();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (profile == null) notFound();

  const isMe = me?.id === profile.id;
  const extra = profile as {
    headline?: string | null;
    company?: string | null;
    cover_url?: string | null;
    location?: string | null;
    website?: string | null;
  };
  const location = extra.location ?? null;
  const website = extra.website ?? null;
  const websiteLabel = website ? website.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") : null;
  const headline = extra.headline ?? null;
  const company = extra.company ?? null;
  const ctx = await getViewerContext(me?.id ?? "");
  const [card] = isMe ? [null] : await enrichPeople(ctx, [profile as never]);

  const [{ data: skills }, { data: memberships }] = await Promise.all([
    supabase.from("user_skills").select("skill_id, evidence, skills(preferred_label)").eq("user_id", profile.id).limit(24),
    supabase.from("community_members").select("role, communities:community_id(id, name, slug, member_count)").eq("user_id", profile.id).eq("status", "active"),
  ]);

  const gapSet = new Set(ctx.gapIds);
  const expertise = (skills ?? [])
    .map((s: { skill_id: string; skills?: unknown }) => {
      const raw = s.skills;
      const sk = (Array.isArray(raw) ? raw[0] : raw) as { preferred_label?: string } | null;
      return { id: s.skill_id, label: sk?.preferred_label ?? "", gap: gapSet.has(s.skill_id) };
    })
    .filter((s) => s.label)
    .sort((a, b) => Number(b.gap) - Number(a.gap));

  const comms = (memberships ?? [])
    .map((m) => {
      const raw = (m as unknown as { communities?: unknown }).communities;
      return (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string; slug: string; member_count: number } | null;
    })
    .filter(Boolean) as { id: string; name: string; slug: string; member_count: number }[];

  const starters = card ? conversationStarters(card, ctx.roleTitle) : [];
  const roleLabel = profile.role === "mentor" ? "Mentor" : profile.role === "member" ? "Member" : profile.role;
  const since = new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={profile.role === "mentor" ? "/app/mentors" : "/app/members"} className="text-[13px] font-medium text-text-secondary hover:text-ink">
        ← Back to people
      </Link>

      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <div className="relative h-28 bg-ink md:h-40">
          {extra.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={extra.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
          )}
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <Avatar
              name={profile.full_name}
              url={(profile as { avatar_url?: string | null }).avatar_url ?? null}
              size={88}
              shape="rounded-2xl"
              className="-mt-11 border-4 border-white shadow-card"
            />
            <div className="pb-1">
              <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-semibold tracking-tight text-ink">
                {profile.full_name || "Member"}
                {profile.verified_expert && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Verified expert</span>}
              </h1>
              {(headline || company) && (
                <p className="text-[14px] text-ink/80">
                  {headline}
                  {headline && company ? " · " : ""}
                  {company ? `at ${company}` : ""}
                </p>
              )}
              {(location || website) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-text-secondary">
                  {location && <span>{"◉"} {location}</span>}
                  {website && websiteLabel && (
                    <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-brand-600 hover:text-brand-700">
                      {websiteLabel} {"↗"}
                    </a>
                  )}
                </p>
              )}
              <p className="text-[13px] text-text-secondary">
                {roleLabel}
                {profile.handle ? ` · @${profile.handle}` : ""} · On ASCENDR since {since}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <Link href="/app/settings" className="rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40">
                Edit profile
              </Link>
            ) : (
              <>
                {card && <ConnectButton p={card} />}
                <Link href="/app/networking" className="rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40">
                  Message
                </Link>
              </>
            )}
          </div>
        </div>
        {profile.bio && <p className="border-t border-border px-6 py-5 text-[15px] leading-relaxed text-ink/80">{profile.bio}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {card && (
            <section className="rounded-2xl bg-ink p-6 text-white">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/60">Why ASCENDR recommends {(profile.full_name ?? "this person").split(" ")[0]}</h2>
              {card.reasons.length ? (
                <ul className="mt-4 space-y-2">
                  {card.reasons.map((r) => (
                    <li key={r} className="flex gap-2.5 text-[15px]">
                      <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                      {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[14px] text-white/70">No direct overlap with your goal yet. Set a goal to see how this person could help.</p>
              )}
            </section>
          )}

          {starters.length > 0 && (
            <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
              <h2 className="text-[16px] font-semibold text-ink">Conversation starters</h2>
              <p className="mt-1 text-[13px] text-text-secondary">Built from what you are working on and what you share. Copy one into your message.</p>
              <ul className="mt-4 space-y-2.5">
                {starters.map((s) => (
                  <li key={s} className="rounded-xl bg-surface px-4 py-3 text-[14px] leading-relaxed text-ink">
                    “{s}”
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
            <h2 className="text-[16px] font-semibold text-ink">Relevant expertise</h2>
            {expertise.length ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {expertise.map((s) => (
                  <span
                    key={s.id}
                    className={`rounded-full border px-3 py-1 text-[12px] ${s.gap ? "border-brand-200 bg-brand-50 font-medium text-brand-700" : "border-border bg-surface text-text-secondary"}`}
                  >
                    {s.label}
                    {s.gap ? " · your gap" : ""}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-text-secondary">No skills listed yet.</p>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <p className="nums text-[26px] font-semibold text-ink">{comms.length}</p>
              <p className="text-[12px] text-text-secondary">Communities</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <p className="nums text-[26px] font-semibold text-ink">{expertise.length}</p>
              <p className="text-[12px] text-text-secondary">Skills listed</p>
            </div>
          </div>

          <section className="rounded-2xl border border-border bg-white shadow-card">
            <h2 className="border-b border-border px-5 py-4 text-[16px] font-semibold text-ink">Communities</h2>
            {comms.length ? (
              <ul className="divide-y divide-border">
                {comms.map((c) => (
                  <li key={c.id}>
                    <Link href={`/app/communities/${c.slug}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface/60">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">{initials(c.name)}</span>
                      <span className="flex-1 truncate text-[14px] font-medium text-ink">{c.name}</span>
                      {ctx.myCommunityIds.has(c.id) && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">You too</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[13px] text-text-secondary">Not in any communities yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
