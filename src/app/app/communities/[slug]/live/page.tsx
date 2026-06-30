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
  live: "bg-danger/10 text-danger",
  scheduled: "bg-[#eef2ff] text-primary",
  ended: "bg-bg text-text-secondary",
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
      <div className="max-w-3xl mx-auto rounded-md border border-border bg-card p-10 text-center text-text-secondary">
        Join {community.name} to see its live sessions.
        <div className="mt-4">
          <Link href={`/app/communities/${community.slug}`} className="text-primary font-semibold">
            ← Back to community
          </Link>
        </div>
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
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-h3 font-bold">Live Sessions</h1>
          <p className="text-small text-text-secondary">{community.name}</p>
        </div>
        <Link
          href={`/app/communities/${community.slug}`}
          className="ml-auto text-small text-primary font-semibold"
        >
          ← Community
        </Link>
      </div>

      {searchParams.error && (
        <div className="mt-4 rounded-sm border border-danger/30 bg-danger/10 px-4 py-2 text-small text-danger">
          {searchParams.error}
        </div>
      )}

      {isMod && (
        <form
          action={scheduleSession}
          className="mt-5 rounded-md border border-border bg-card p-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end"
        >
          <input type="hidden" name="community_id" value={community.id} />
          <input type="hidden" name="slug" value={community.slug} />
          <div>
            <label className="block text-caption font-semibold text-text-secondary">Title</label>
            <input
              name="title"
              required
              placeholder="e.g. Live AMA: breaking into product"
              className="mt-1 w-full rounded-sm border border-border px-3 py-2 text-small"
            />
          </div>
          <div>
            <label className="block text-caption font-semibold text-text-secondary">When</label>
            <input
              type="datetime-local"
              name="scheduled_at"
              required
              className="mt-1 rounded-sm border border-border px-3 py-2 text-small"
            />
          </div>
          <button className="rounded-sm bg-primary px-4 py-2 text-small font-semibold text-white">
            Schedule (+20 XP)
          </button>
        </form>
      )}

      <Section title="Upcoming & live" sessions={upcoming} slug={community.slug} empty="No upcoming sessions yet." />
      <Section title="Past sessions" sessions={past} slug={community.slug} empty="No past sessions." />
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
    <div className="mt-6">
      <h2 className="mb-2 text-small font-bold uppercase tracking-wide text-text-secondary">{title}</h2>
      {sessions.length === 0 ? (
        <p className="text-small text-text-secondary">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/app/communities/${slug}/live/${s.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 hover:border-primary"
              >
                <div>
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-caption text-text-secondary">{fmt(s.scheduled_at)}</div>
                </div>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 text-caption font-semibold capitalize ${
                    STATUS_STYLE[s.status] ?? "bg-bg text-text-secondary"
                  }`}
                >
                  {s.status === "live" ? "● Live" : s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
