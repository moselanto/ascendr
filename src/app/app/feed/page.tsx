import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { createPost } from "../feed-actions";
import PostCard from "./PostCard";

export const dynamic = "force-dynamic";

type Reaction = { post_id: string; emoji: string; user_id: string };
type Comment = {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles?: { full_name?: string } | null;
};

function initialsOf(name: string | null | undefined) {
  const parts = (name || "Me").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "M";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default async function FeedPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  // Posts with author info.
  const { data: postRows } = await supabase
    .from("feed_posts")
    .select("id, body, kind, community_id, created_at, author_id, profiles:author_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);
  const posts = postRows ?? [];
  const ids = posts.map((p) => p.id);

  // Reactions + comments for those posts (batched).
  let reactions: Reaction[] = [];
  let comments: Comment[] = [];
  if (ids.length) {
    const [{ data: rx }, { data: cm }] = await Promise.all([
      supabase.from("post_reactions").select("post_id, emoji, user_id").in("post_id", ids),
      supabase
        .from("post_comments")
        .select("id, post_id, body, created_at, author_id, profiles:author_id(full_name)")
        .in("post_id", ids)
        .order("created_at", { ascending: true }),
    ]);
    reactions = (rx as Reaction[]) ?? [];
    comments = (cm as unknown as Comment[]) ?? [];
  }

  const myName = profile?.full_name ?? null;
  const myPostCount = posts.filter((p) => p.author_id === profile!.id).length;

  return (
    <div className="space-y-8">
      {/* Page head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Community</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            Your feed, <span className="accent-serif">in good company.</span>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">Updates from you and your communities.</p>
        </div>
        <a
          href="#composer"
          className="self-start rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 md:self-auto"
        >
          New post
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Composer (global post) */}
          <form
            id="composer"
            action={createPost}
            className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6"
          >
            <div className="flex gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
                {initialsOf(myName)}
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="feed-body" className="text-[12px] font-medium text-text-secondary">
                  Share with the community
                </label>
                <textarea
                  id="feed-body"
                  name="body"
                  required
                  rows={3}
                  placeholder="Share an update, a win, or a question…"
                  className="mt-1.5 w-full resize-none rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700">
                +10 XP per post
              </span>
              <button
                type="submit"
                className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
              >
                Post
              </button>
            </div>
          </form>

          {/* Feed */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
                <p className="text-[15px] font-semibold text-ink">No posts yet</p>
                <p className="mt-1 text-[14px] text-text-secondary">
                  Be the first to share a win, a question, or something you learned this week.
                </p>
                <a
                  href="#composer"
                  className="mt-5 inline-flex rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700"
                >
                  Write the first post
                </a>
              </div>
            ) : (
              posts.map((p) => {
                const postReactions = reactions.filter((r) => r.post_id === p.id);
                const postComments = comments.filter((c) => c.post_id === p.id);
                return (
                  <PostCard
                    key={p.id}
                    post={{
                      id: p.id,
                      body: p.body,
                      created_at: p.created_at,
                      // @ts-expect-error supabase join shape
                      author_name: p.profiles?.full_name ?? "Member",
                    }}
                    meId={profile!.id}
                    reactions={postReactions.map((r) => ({ emoji: r.emoji, user_id: r.user_id }))}
                    comments={postComments.map((c) => ({
                      id: c.id,
                      body: c.body,
                      author_name: c.profiles?.full_name ?? "Member",
                    }))}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Side column */}
        <aside className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white">
            <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
            <div className="relative">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">Grow in public</p>
              <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.01em]">Show up, earn XP.</h2>
              <ul className="mt-4 space-y-2 text-[14px] text-white/80">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Post an update: +10 XP
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Comment on a post: +3 XP
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <p className="text-[12px] font-medium text-text-secondary">Recent posts</p>
              <p className="nums mt-1 text-[28px] font-semibold text-ink">{posts.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <p className="text-[12px] font-medium text-text-secondary">Yours</p>
              <p className="nums mt-1 text-[28px] font-semibold text-ink">{myPostCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
            <h2 className="text-[16px] font-semibold text-ink">Find your people</h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              Join communities to see more conversations and live sessions here.
            </p>
            <Link
              href="/app/communities"
              className="mt-4 inline-flex rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40"
            >
              Browse communities →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
