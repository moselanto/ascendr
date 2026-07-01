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

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-h3 font-bold">Feed</h1>
        <p className="text-small text-text-secondary">Updates from you and your communities.</p>
      </div>

      {/* Composer (global post) */}
      <form action={createPost} className="rounded-md border border-border bg-card p-4">
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Share an update, a win, or a question…"
          className="w-full resize-none rounded-sm border border-border p-3 text-body outline-none focus:border-primary"
        />
        <div className="mt-2 flex justify-end">
          <button className="rounded-sm bg-primary px-5 py-2.5 text-small font-semibold text-white">
            Post (+10 XP)
          </button>
        </div>
      </form>

      {/* Feed */}
      <div className="flex flex-col gap-3">
        {posts.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-text-secondary">
            No posts yet. Be the first to share something.
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
  );
}
