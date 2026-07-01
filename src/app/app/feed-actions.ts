"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { awardXp } from "@/lib/xp";

/** Create a feed post (global if no community_id). Awards +10 XP. */
export async function createPost(formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  const communityId = String(formData.get("community_id") || "").trim() || null;
  if (!body) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  await supabase.from("feed_posts").insert({
    author_id: profile.id,
    community_id: communityId,
    kind: "text",
    body,
  });

  await awardXp(profile.id, "feed_post", 10, communityId ?? undefined);
  revalidatePath("/app/feed");
}

/** Toggle a reaction emoji on a post (add if absent, remove if present). */
export async function togglePostReaction(postId: string, emoji: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("post_reactions")
    .select("emoji")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", profile.id)
      .eq("emoji", emoji);
  } else {
    await supabase.from("post_reactions").insert({ post_id: postId, user_id: profile.id, emoji });
  }
  revalidatePath("/app/feed");
}

/** Add a comment to a post. Awards +3 XP + notifies the post author. */
export async function addComment(formData: FormData) {
  const postId = String(formData.get("post_id"));
  const body = String(formData.get("body") || "").trim();
  if (!postId || !body) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  await supabase.from("post_comments").insert({
    post_id: postId,
    author_id: profile.id,
    body,
  });

  // Notify the post author (unless commenting on your own post).
  const { data: post } = await supabase
    .from("feed_posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();
  if (post && post.author_id !== profile.id) {
    await supabase.from("notifications").insert({
      user_id: post.author_id,
      type: "comment",
      actor_id: profile.id,
      entity_type: "feed_post",
      entity_id: postId,
      body: `${profile.full_name || "Someone"} commented on your post`,
    });
  }

  await awardXp(profile.id, "feed_comment", 3);
  revalidatePath("/app/feed");
}
