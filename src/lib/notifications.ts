import type { createClient } from "@/lib/supabase/server";

export type NotifRow = {
  id: string;
  type: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
};

/** Where a notification should take the member when they open it. */
export async function resolveNotificationTarget(
  supabase: ReturnType<typeof createClient>,
  n: NotifRow
): Promise<string> {
  if (n.type === "dm" && n.actor_id) return `/app/networking?dm=${n.actor_id}`;
  if (n.type.startsWith("connection")) return "/app/networking";
  if (n.entity_type === "feed_post") return "/app/feed";
  if (n.entity_type === "community" && n.entity_id) {
    const { data } = await supabase.from("communities").select("slug").eq("id", n.entity_id).maybeSingle();
    if (data?.slug) return `/app/communities/${data.slug}`;
    return "/app/communities";
  }
  if (n.entity_type === "profile" && n.entity_id) return `/app/members/${n.entity_id}`;
  if (n.entity_type === "organization") return n.entity_id ? `/app/network?org=${n.entity_id}` : "/app/network";
  return "/app/notifications";
}

/** "just now", "5m", "3h", "2d", then a short date. */
export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
