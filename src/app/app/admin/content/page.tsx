import { one, tryAdminClient } from "../_lib/admin-client";
import {
  AdminClientError,
  Card,
  Chip,
  EmptyState,
  Kpi,
  PageHead,
  SectionTitle,
  displayName,
  formatDate,
  formatNumber,
} from "../_components/ui";
import { memberLabel } from "@/lib/plural";

export const dynamic = "force-dynamic";

/** Read-only content overview: communities, feed posts and live sessions. */

type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  visibility: string | null;
  member_count: number | null;
  created_at: string | null;
};

type NameRef = { full_name: string | null; handle: string | null };

type PostRow = {
  id: string;
  kind: string | null;
  body: string | null;
  created_at: string | null;
  profiles: NameRef | NameRef[] | null;
};

type SessionRow = {
  id: string;
  title: string | null;
  status: string | null;
  scheduled_at: string | null;
  communities: { name: string | null } | { name: string | null }[] | null;
};

function excerpt(s: string | null, n = 140): string {
  if (!s) return "(no text)";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}...` : t;
}

function statusTone(status: string | null): "brand" | "emerald" | "amber" | "neutral" {
  if (status === "live") return "emerald";
  if (status === "scheduled") return "brand";
  if (status === "ended") return "neutral";
  return "amber";
}

export default async function AdminContentPage() {
  const admin = tryAdminClient();
  if (!admin) {
    return (
      <div className="space-y-6">
        <PageHead title="Content" />
        <AdminClientError />
      </div>
    );
  }

  const [communities, posts, sessions] = await Promise.all([
    admin
      .from("communities")
      .select("id, name, slug, visibility, member_count, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("feed_posts")
      .select("id, kind, body, created_at, profiles:author_id(full_name, handle)", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("live_sessions")
      .select("id, title, status, scheduled_at, communities(name)", { count: "exact" })
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .limit(6),
  ]);

  const communityList = (communities.data ?? []) as unknown as CommunityRow[];
  const postList = (posts.data ?? []) as unknown as PostRow[];
  const sessionList = (sessions.data ?? []) as unknown as SessionRow[];

  return (
    <div className="space-y-8">
      <PageHead title="Content" description="What members are creating across communities, the feed and live sessions. Read-only." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Communities" value={communities.error ? "-" : formatNumber(communities.count ?? 0)} />
        <Kpi label="Feed posts" value={posts.error ? "-" : formatNumber(posts.count ?? 0)} />
        <Kpi label="Live sessions" value={sessions.error ? "-" : formatNumber(sessions.count ?? 0)} />
      </div>

      <section>
        <SectionTitle>Latest communities</SectionTitle>
        {communities.error ? (
          <EmptyState title="Could not load communities" body={communities.error.message} />
        ) : communityList.length === 0 ? (
          <EmptyState title="No communities yet" />
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {communityList.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{c.name}</p>
                    <p className="text-[12px] text-text-secondary">
                      /{c.slug} - created {formatDate(c.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="nums text-[13px] text-text-secondary">{memberLabel(c.member_count)}</span>
                    <Chip tone={c.visibility === "paid" ? "amber" : c.visibility === "private" ? "neutral" : "emerald"}>
                      {c.visibility ?? "public"}
                    </Chip>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Latest feed posts</SectionTitle>
          {posts.error ? (
            <EmptyState title="Could not load feed posts" body={posts.error.message} />
          ) : postList.length === 0 ? (
            <EmptyState title="No feed posts yet" />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-border">
                {postList.map((p) => (
                  <li key={p.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[13px] font-medium text-ink">{displayName(one(p.profiles))}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <Chip tone="brand">{p.kind ?? "text"}</Chip>
                        <span className="text-[12px] text-text-secondary">{formatDate(p.created_at)}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-[13px] text-text-secondary">{excerpt(p.body)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section>
          <SectionTitle>Latest live sessions</SectionTitle>
          {sessions.error ? (
            <EmptyState title="Could not load live sessions" body={sessions.error.message} />
          ) : sessionList.length === 0 ? (
            <EmptyState title="No live sessions yet" />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-border">
                {sessionList.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{s.title || "Untitled session"}</p>
                      <p className="text-[12px] text-text-secondary">
                        {one(s.communities)?.name ?? "No community"} - {formatDate(s.scheduled_at)}
                      </p>
                    </div>
                    <Chip tone={statusTone(s.status)}>{s.status ?? "unknown"}</Chip>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
