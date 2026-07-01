import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  title: string;
  scheduled_at: string | null;
  status: string;
  community_id: string;
  communities?: unknown;
};

type Session = {
  id: string;
  title: string;
  scheduled_at: string | null;
  status: string;
  communitySlug: string;
  communityName: string;
};

function fmtWhen(dt: string | null) {
  if (!dt) return "TBD";
  return new Date(dt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_STYLE: Record<string, string> = {
  live: "bg-[#fef2f2] text-danger",
  scheduled: "bg-[#eef2ff] text-primary",
  ended: "bg-bg text-text-secondary",
};

export default async function LiveIndexPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  // Communities the user actively belongs to.
  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", profile!.id)
    .eq("status", "active");
  const communityIds = (memberships ?? []).map((m) => m.community_id);

  let sessions: Session[] = [];
  if (communityIds.length) {
    const { data: rows } = await supabase
      .from("live_sessions")
      .select("id, title, scheduled_at, status, community_id, communities:community_id(name, slug)")
      .in("community_id", communityIds)
      .order("scheduled_at", { ascending: true });

    sessions = ((rows as SessionRow[]) ?? []).map((r) => {
      const raw = r.communities;
      const comm = (Array.isArray(raw) ? raw[0] : raw) as
        | { name: string; slug: string }
        | null
        | undefined;
      return {
        id: r.id,
        title: r.title,
        scheduled_at: r.scheduled_at,
        status: r.status,
        communitySlug: comm?.slug ?? "",
        communityName: comm?.name ?? "Community",
      };
    });
  }

  const now = Date.now();
  const upcoming = sessions.filter(
    (s) =>
      s.status === "live" ||
      (s.status === "scheduled" && (!s.scheduled_at || new Date(s.scheduled_at).getTime() >= now - 3600_000))
  );
  const past = sessions.filter((s) => !upcoming.includes(s));

  function row(s: Session) {
    return (
      <Link
        key={s.id}
        href={`/app/communities/${s.communitySlug}/live/${s.id}`}
        className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 hover:border-primary"
      >
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
          ◉
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{s.title}</div>
          <div className="text-caption text-text-secondary truncate">
            {s.communityName} · {fmtWhen(s.scheduled_at)}
          </div>
        </div>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-caption font-semibold capitalize ${
            STATUS_STYLE[s.status] ?? "bg-bg text-text-secondary"
          }`}
        >
          {s.status === "live" ? "● LIVE" : s.status}
        </span>
      </Link>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-h3 font-bold">Live Sessions</h1>
        <p className="text-small text-text-secondary">Upcoming and live across your communities.</p>
      </div>

      {communityIds.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-text-secondary">
          Join a community to see its live sessions.{" "}
          <Link href="/app/communities" className="text-primary font-semibold">
            Browse communities
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="mb-2 text-small font-bold uppercase tracking-wide text-text-secondary">
            Live &amp; upcoming
          </div>
          {upcoming.length ? (
            <div className="flex flex-col gap-2">{upcoming.map(row)}</div>
          ) : (
            <p className="text-small text-text-secondary">No upcoming sessions right now.</p>
          )}

          <div className="mb-2 mt-6 text-small font-bold uppercase tracking-wide text-text-secondary">Past</div>
          {past.length ? (
            <div className="flex flex-col gap-2">{past.map(row)}</div>
          ) : (
            <p className="text-small text-text-secondary">No past sessions yet.</p>
          )}
        </>
      )}
    </div>
  );
}
