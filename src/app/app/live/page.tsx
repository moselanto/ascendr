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
  if (!dt) return "Time TBD";
  return new Date(dt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDay(dt: string | null) {
  if (!dt) return { day: "—", month: "TBD" };
  const d = new Date(dt);
  return {
    day: String(d.getDate()),
    month: d.toLocaleString(undefined, { month: "short" }).toUpperCase(),
  };
}

const STATUS_STYLE: Record<string, string> = {
  live: "bg-emerald-50 text-emerald-800",
  scheduled: "bg-brand-50 text-brand-700",
  ended: "bg-surface text-text-secondary",
};

function sessionHref(s: Session) {
  return `/app/communities/${s.communitySlug}/live/${s.id}`;
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <span className="nums rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium text-text-secondary">
        {count}
      </span>
    </div>
  );
}

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
  const liveNow = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter(
    (s) =>
      s.status === "scheduled" && (!s.scheduled_at || new Date(s.scheduled_at).getTime() >= now - 3600_000)
  );
  const past = sessions.filter((s) => !liveNow.includes(s) && !upcoming.includes(s)).reverse();
  const featured = liveNow[0] ?? null;
  const otherLive = featured ? liveNow.slice(1) : [];

  function row(s: Session, variant: "live" | "upcoming" | "past") {
    const d = fmtDay(s.scheduled_at);
    return (
      <div key={s.id} className="flex items-center gap-4 px-5 py-4">
        <div className="flex h-12 w-12 flex-none flex-col items-center justify-center rounded-xl bg-surface text-ink">
          <span className="text-[10px] font-semibold tracking-[0.08em] text-text-secondary">{d.month}</span>
          <span className="nums text-[16px] font-semibold leading-none">{d.day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-ink">{s.title}</div>
          <div className="truncate text-[13px] text-text-secondary">
            {s.communityName} · {fmtWhen(s.scheduled_at)}
          </div>
        </div>
        <span
          className={`hidden rounded-full px-2.5 py-1 text-[12px] font-medium capitalize sm:inline-flex ${
            STATUS_STYLE[s.status] ?? "bg-surface text-text-secondary"
          }`}
        >
          {s.status === "live" ? "Live now" : s.status}
        </span>
        <Link
          href={sessionHref(s)}
          className={
            variant === "live"
              ? "flex-none rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink-700"
              : "flex-none rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40"
          }
        >
          {variant === "live" ? "Join" : variant === "upcoming" ? "View" : "Replay"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Live</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            Live sessions, <span className="accent-serif">in the room.</span>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">Upcoming and live across your communities.</p>
        </div>
        <Link
          href="/app/communities"
          className="self-start rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40 md:self-auto"
        >
          Browse communities
        </Link>
      </div>

      {communityIds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="text-[15px] font-semibold text-ink">No live sessions to show yet</p>
          <p className="mt-1 text-[14px] text-text-secondary">
            Join a community and its live sessions will appear here.
          </p>
          <Link
            href="/app/communities"
            className="mt-5 inline-flex rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
          >
            Browse communities
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <p className="text-[12px] font-medium text-text-secondary">Live now</p>
              <p className="nums mt-1 text-[28px] font-semibold text-ink">{liveNow.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <p className="text-[12px] font-medium text-text-secondary">Upcoming</p>
              <p className="nums mt-1 text-[28px] font-semibold text-ink">{upcoming.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <p className="text-[12px] font-medium text-text-secondary">Past</p>
              <p className="nums mt-1 text-[28px] font-semibold text-ink">{past.length}</p>
            </div>
          </div>

          {/* Live now */}
          <section>
            <SectionTitle title="Live now" count={liveNow.length} />
            {featured ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white">
                  <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
                  <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">
                        <span className="h-2 w-2 rounded-full bg-accent" /> Happening now
                      </p>
                      <h3 className="mt-2 truncate text-[22px] font-semibold tracking-[-0.01em]">{featured.title}</h3>
                      <p className="mt-1 text-[14px] text-white/70">
                        {featured.communityName} · started {fmtWhen(featured.scheduled_at)}
                      </p>
                    </div>
                    <Link
                      href={sessionHref(featured)}
                      className="self-start rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-white/90 md:self-auto"
                    >
                      Join session →
                    </Link>
                  </div>
                </div>
                {otherLive.length > 0 && (
                  <div className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
                    {otherLive.map((s) => row(s, "live"))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
                <p className="text-[15px] font-semibold text-ink">Nothing is live right now</p>
                <p className="mt-1 text-[14px] text-text-secondary">
                  When a host goes live in one of your communities, you can join from here.
                </p>
                <a
                  href="#upcoming"
                  className="mt-5 inline-flex rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40"
                >
                  See what&apos;s upcoming
                </a>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Upcoming */}
            <section id="upcoming">
              <SectionTitle title="Upcoming" count={upcoming.length} />
              {upcoming.length ? (
                <div className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
                  {upcoming.map((s) => row(s, "upcoming"))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
                  <p className="text-[15px] font-semibold text-ink">No upcoming sessions</p>
                  <p className="mt-1 text-[14px] text-text-secondary">
                    Explore more communities to find sessions on the topics you care about.
                  </p>
                  <Link
                    href="/app/communities"
                    className="mt-5 inline-flex rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
                  >
                    Find communities
                  </Link>
                </div>
              )}
            </section>

            {/* Past */}
            <section>
              <SectionTitle title="Past" count={past.length} />
              {past.length ? (
                <div className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
                  {past.map((s) => row(s, "past"))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
                  <p className="text-[15px] font-semibold text-ink">No past sessions yet</p>
                  <p className="mt-1 text-[14px] text-text-secondary">
                    Sessions you could have attended will be listed here once they end.
                  </p>
                  <a
                    href="#upcoming"
                    className="mt-5 inline-flex rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40"
                  >
                    View upcoming
                  </a>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
