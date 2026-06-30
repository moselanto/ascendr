import Link from "next/link";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "./actions";
import type { FeedPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", profile!.id)
    .maybeSingle();

  const { data: xp } = await supabase
    .from("xp_events")
    .select("points")
    .eq("user_id", profile!.id);
  const totalXp = (xp ?? []).reduce((s, e) => s + (e.points ?? 0), 0);

  const { data: posts } = await supabase
    .from("feed_posts")
    .select("*, profiles:author_id(full_name, handle, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      {/* Streak banner */}
      <div className="flex items-center gap-4 rounded-md bg-gradient-to-r from-primary to-secondary p-5 text-white">
        <div className="text-3xl">🔥</div>
        <div className="flex-1">
          <div className="font-extrabold text-h4">
            {streak?.current_len ?? 0}-day streak — don&apos;t break it!
          </div>
          <div className="text-small opacity-90">Post today to keep it alive.</div>
        </div>
        <div className="text-right">
          <div className="text-h3 font-black">{totalXp}</div>
          <div className="text-caption opacity-90">total XP</div>
        </div>
      </div>

      {/* Composer */}
      <form action={createPost} className="rounded-md border border-border bg-card p-4">
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Share an update with the community…"
          className="w-full resize-none rounded-sm border border-border p-3 text-body"
        />
        <div className="mt-2 flex justify-end">
          <button className="rounded-sm bg-primary px-5 py-2.5 text-small font-semibold text-white">
            Post (+10 XP)
          </button>
        </div>
      </form>

      {/* Feed */}
      <div className="flex flex-col gap-3">
        <h2 className="text-h4 font-bold">Feed</h2>
        {(posts as FeedPost[] | null)?.length ? (
          (posts as FeedPost[]).map((p) => (
            <div key={p.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-small">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
                  {(p.profiles?.full_name || "M").slice(0, 1).toUpperCase()}
                </div>
                <span className="font-semibold">{p.profiles?.full_name || "Member"}</span>
                <span className="text-text-secondary">· {new Date(p.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-body whitespace-pre-wrap">{p.body}</p>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-text-secondary">
            No posts yet. Be the first to share — or{" "}
            <Link href="/app/communities" className="text-primary font-semibold">
              join a community
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  );
}
