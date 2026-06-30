"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { awardXp } from "@/lib/xp";

/** Create a feed post (home feed). Awards +10 XP. */
export async function createPost(formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  const communityId = (formData.get("community_id") as string) || null;
  if (!body) return;

  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = createClient();
  await supabase.from("feed_posts").insert({
    author_id: profile.id,
    community_id: communityId,
    kind: "text",
    body,
  });

  await awardXp(profile.id, "feed_post", 10, communityId);
  revalidatePath("/app");
}
