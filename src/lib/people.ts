import { createClient } from "@/lib/supabase/server";
import { analyzeGap } from "@/lib/career/gap";

/**
 * People intelligence (PRD section 4.2): every recommendation answers
 * "why this person?" with reasons traceable to rows.
 *
 * Reasons we can actually back today:
 *   - holds one or more of the viewer's core skill gaps (user_skills)
 *   - verified expert (profiles.verified_expert)
 *   - shares a community with the viewer (community_members)
 *   - is a mentor
 * Never "mutual connections" or "2nd-degree" (PRD section 6).
 */

export type ConnectionState = "none" | "pending_out" | "pending_in" | "connected";

export type PersonCard = {
  id: string;
  full_name: string | null;
  handle: string | null;
  role: string;
  bio: string | null;
  verified_expert: boolean;
  covers: string[];
  sharedCommunities: string[];
  reasons: string[];
  score: number;
  connection: ConnectionState;
  connectionId: string | null;
};

export type ViewerContext = {
  me: string;
  gapIds: string[];
  gapLabel: Map<string, string>;
  myCommunityIds: Set<string>;
  roleTitle: string | null;
};

export async function getViewerContext(me: string): Promise<ViewerContext> {
  const supabase = createClient();
  const [{ data: goal }, { data: mem }] = await Promise.all([
    supabase
      .from("career_goals")
      .select("id, target_title")
      .eq("user_id", me)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("community_members").select("community_id").eq("user_id", me).eq("status", "active"),
  ]);
  const analysis = goal ? await analyzeGap(me, goal.id) : null;
  const gaps = (analysis?.gaps ?? []).filter((g) => g.importance === "essential");
  return {
    me,
    gapIds: gaps.map((g) => g.skillId),
    gapLabel: new Map(gaps.map((g) => [g.skillId, g.label])),
    myCommunityIds: new Set((mem ?? []).map((m: { community_id: string }) => m.community_id)),
    roleTitle: analysis?.roleTitle ?? goal?.target_title ?? null,
  };
}

type RawProfile = {
  id: string;
  full_name: string | null;
  handle: string | null;
  role: string;
  bio: string | null;
  verified_expert: boolean | null;
};

export async function enrichPeople(ctx: ViewerContext, profiles: RawProfile[]): Promise<PersonCard[]> {
  const supabase = createClient();
  const ids = profiles.map((p) => p.id).filter((id) => id !== ctx.me);
  if (ids.length === 0) return [];

  const [skillsRes, commRes, connRes] = await Promise.all([
    ctx.gapIds.length
      ? supabase.from("user_skills").select("user_id, skill_id").in("user_id", ids).in("skill_id", ctx.gapIds)
      : Promise.resolve({ data: [] as { user_id: string; skill_id: string }[] }),
    ctx.myCommunityIds.size
      ? supabase
          .from("community_members")
          .select("user_id, community_id, communities:community_id(name)")
          .in("user_id", ids)
          .in("community_id", Array.from(ctx.myCommunityIds))
          .eq("status", "active")
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("connections")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${ctx.me},addressee_id.eq.${ctx.me}`),
  ]);

  const covers = new Map<string, string[]>();
  ((skillsRes.data ?? []) as { user_id: string; skill_id: string }[]).forEach((r) => {
    const l = covers.get(r.user_id) ?? [];
    l.push(ctx.gapLabel.get(r.skill_id) ?? "");
    covers.set(r.user_id, l);
  });

  const shared = new Map<string, string[]>();
  ((commRes.data ?? []) as { user_id: string; communities?: unknown }[]).forEach((r) => {
    const raw = r.communities;
    const c = (Array.isArray(raw) ? raw[0] : raw) as { name?: string } | null;
    const l = shared.get(r.user_id) ?? [];
    if (c?.name) l.push(c.name);
    shared.set(r.user_id, l);
  });

  const conn = new Map<string, { state: ConnectionState; id: string }>();
  ((connRes.data ?? []) as { id: string; requester_id: string; addressee_id: string; status: string }[]).forEach((c) => {
    const other = c.requester_id === ctx.me ? c.addressee_id : c.requester_id;
    let state: ConnectionState = "none";
    if (c.status === "accepted") state = "connected";
    else if (c.status === "pending") state = c.requester_id === ctx.me ? "pending_out" : "pending_in";
    if (state === "none") return;
    conn.set(other, { state, id: c.id });
  });

  return profiles
    .filter((p) => p.id !== ctx.me)
    .map((p) => {
      const cv = covers.get(p.id) ?? [];
      const sh = shared.get(p.id) ?? [];
      const reasons: string[] = [];
      if (cv.length) reasons.push(`Has ${cv.slice(0, 2).join(" and ").toLowerCase()}, ${cv.length === 1 ? "one of your gaps" : "among your gaps"}`);
      if (sh.length) reasons.push(`Both in ${sh[0]}${sh.length > 1 ? ` and ${sh.length - 1} more` : ""}`);
      if (p.verified_expert) reasons.push("Verified expert");
      if (p.role === "mentor" && reasons.length === 0) reasons.push("Mentor on ASCENDR");
      const score = cv.length * 3 + sh.length * 2 + (p.verified_expert ? 1 : 0) + (p.role === "mentor" ? 1 : 0);
      const c = conn.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        handle: p.handle,
        role: p.role,
        bio: p.bio,
        verified_expert: Boolean(p.verified_expert),
        covers: cv,
        sharedCommunities: sh,
        reasons,
        score,
        connection: c?.state ?? "none",
        connectionId: c?.id ?? null,
      };
    });
}

/** Conversation starters built from facts on both sides, never generated. */
export function conversationStarters(person: PersonCard, roleTitle: string | null): string[] {
  const first = (person.full_name ?? "there").split(" ")[0];
  const out: string[] = [];
  if (person.covers[0]) {
    out.push(`Hi ${first}, I'm working on ${person.covers[0].toLowerCase()}. How did you learn it, and what does good look like day to day?`);
  }
  if (roleTitle) {
    out.push(`I'm aiming to become a ${roleTitle}. What do you wish you had known before making a move like that?`);
  }
  if (person.sharedCommunities[0]) {
    out.push(`We're both in ${person.sharedCommunities[0]}. Would you be open to a 15-minute conversation about your path?`);
  }
  if (out.length < 3) out.push(`What's one thing that made the biggest difference in your career so far?`);
  return out.slice(0, 3);
}

export function initials(name: string | null | undefined) {
  return (
    (name || "Member")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M"
  );
}
