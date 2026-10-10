import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { timeAgo } from "@/lib/notifications";
import { Avatar } from "@/components/ui/Avatar";
import { markNotificationsRead } from "../notifications-actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  actor_id: string | null;
};

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (profile == null) redirect("/login");
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("id, type, body, read_at, created_at, actor_id")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Row[];

  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x))));
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
  const actorMap = new Map((actors ?? []).map((a) => [a.id, a]));
  const unread = rows.filter((r) => r.read_at == null).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Notifications</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            What you <span className="accent-serif">missed</span>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            {unread > 0 ? `${unread} unread` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <form action={markNotificationsRead}>
            <button className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="text-[15px] font-semibold text-ink">No notifications yet</p>
          <p className="mt-1 text-[14px] text-text-secondary">
            Messages, connection requests and replies to your posts will show up here.
          </p>
          <Link href="/app/members" className="mt-5 inline-flex rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
            Find people to connect with
          </Link>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-white shadow-card">
          {rows.map((n) => {
            const actor = n.actor_id ? actorMap.get(n.actor_id) : undefined;
            return (
              <a
                key={n.id}
                href={`/app/notifications/${n.id}`}
                className={`flex items-start gap-3 px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface ${n.read_at ? "" : "bg-brand-50/50"}`}
              >
                <Avatar name={actor?.full_name ?? "ASCENDR"} url={actor?.avatar_url ?? null} size={40} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[14px] ${n.read_at ? "text-ink/80" : "font-medium text-ink"}`}>{n.body || n.type}</p>
                  <p className="mt-0.5 text-[12px] text-text-secondary">{timeAgo(n.created_at)}</p>
                </div>
                {n.read_at == null && <span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
