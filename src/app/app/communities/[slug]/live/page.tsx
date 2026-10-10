import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { scheduleSession } from "../../live-actions";

export const dynamic = "force-dynamic";

type Session = {
  id: string;
  title: string;
  scheduled_at: string | null;
  status: string;
};

function fmt(dt: string | null) {
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
  live: "bg-emerald-50 text-emerald-800",
  scheduled: "bg-brand-50 text-brand-700",
  ended: "bg-surface text-text-secondary",
};

export default async function LiveSessionsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { error?: string };
}) {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!community) notFound();

  const { data: membership } = await supabase
    .from("community_members")
    .select("role, status")
    .eq("community_id", community.id)
    .eq("user_id", profile!.id)
    .maybeSingle();
  const isMember = membership?.status === "active";
  const isMod = membership?.role === "owner" || membership?.role === "moderator";

  if (!isMember) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <div className="text-[15px] font-semibold text-ink">Members only</div>
        <p className="mt-1 text-[14px] text-text-secondary">Join {community.name} to see its live sessions.</p>
        <Link
          href={`/app/communities/${community.slug}`}
          className="mt-4 inline-block rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
        >
          Back to community
        </Link>
      </div>
    );
  }

  const { data: sessionRows } = await supabase
    .from("live_sessions")
    .select("id, title, scheduled_at, status")
    .eq("community_id", community.id)
    .order("scheduled_at", { ascending: true });
  const sessions = (sessionRows as Session[]) ?? [];

  const now = Date.now();
  const upcoming = sessions.filter(
    (s) => s.status === "live" || (s.status === "scheduled" && (!s.scheduled_at || new Date(s.scheduled_at).getTime() >= now - 3600_000))
  );
  const past = sessions.filter((s) => !upcoming.includes(s));

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/app/communities/${community.slug}`}
        className="text-[13px] font-medium text-text-secondary hover:text-ink"
      >
        {"\u2190"} {community.name}
      </Link>

      {/* Page head */}
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Live sessions</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            Learn it <em className="accent-serif">in the room</em>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            AMAs, workshops and office hours in {community.name}.
          </p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[14px] text-danger">
          {searchParams.error}
        </div>
      )}

      {isMod && (
        <form
          action={scheduleSession}
          className="mt-6 grid items-end gap-4 rounded-2xl border border-border bg-white p-5 shadow-card sm:grid-cols-[1fr_auto_auto] md:p-6"
        >
          <input type="hidden" name="community_id" value={community.id} />
          <input type="hidden" name="slug" value={community.slug} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-title" className="text-[12px] font-medium text-text-secondary">
              Title
            </label>
            <input
              id="session-title"
              name="title"
              required
              placeholder="e.g. Live AMA: breaking into product"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-when" className="text-[12px] font-medium text-text-secondary">
              When
            </label>
            <input
              id="session-when"
              type="datetime-local"
              name="scheduled_at"
              required
              className="rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink"
            />
          </div>
          <button className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
            Schedule session
          </button>
        </form>
      )}

      <Section
        title="Upcoming and live"
        sessions={upcoming}
        slug={community.slug}
        empty={isMod ? "Schedule one above to bring members together." : "Check back soon for the next session."}
      />
      <Section title="Past sessions" sessions={past} slug={community.slug} empty="Ended sessions will be listed here." />
    </div>
  );
}

function Section({
  title,
  sessions,
  slug,
  empty,
}: {
  title: string;
  sessions: Session[];
  slug: string;
  empty: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>
      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
          <div className="text-[14px] font-semibold text-ink">Nothing here yet</div>
          <p className="mt-1 text-[14px] text-text-secondary">{empty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-card">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/app/communities/${slug}/live/${s.id}`}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">
                  {"\u25C9"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{s.title}</div>
                  <div className="text-[12px] text-text-secondary">{fmt(s.scheduled_at)}</div>
                </div>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium capitalize ${
                    STATUS_STYLE[s.status] ?? "bg-surface text-text-secondary"
                  }`}
                >
                  {s.status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  {s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
