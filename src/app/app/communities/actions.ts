"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { awardXp } from "@/lib/xp";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "community"
  );
}

/** Create a community + its default discussion channel; owner auto-joins. Awards +25 XP. */
export async function createCommunity(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!name) redirect("/app/communities/new?error=Name is required");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: community, error } = await supabase
    .from("communities")
    .insert({
      owner_id: profile.id,
      slug,
      name,
      description,
      visibility: "public",
      member_count: 1,
    })
    .select("id, slug")
    .single();

  if (error || !community) {
    redirect(`/app/communities/new?error=${encodeURIComponent(error?.message || "Could not create")}`);
  }

  // Owner membership + default discussion channel.
  await supabase.from("community_members").insert({
    community_id: community.id,
    user_id: profile.id,
    role: "owner",
    status: "active",
  });
  await supabase.from("community_channels").insert({
    community_id: community.id,
    kind: "discussion",
    name: "discussion",
    position: 0,
  });

  await awardXp(profile.id, "community_create", 25, community.id);
  redirect(`/app/communities/${community.slug}`);
}

/** Join a public community instantly. Awards +15 XP. */
export async function joinCommunity(formData: FormData) {
  const communityId = String(formData.get("community_id"));
  const slug = String(formData.get("slug"));
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { error } = await supabase.from("community_members").insert({
    community_id: communityId,
    user_id: profile.id,
    role: "member",
    status: "active",
  });

  if (!error) {
    // Increment member_count (best-effort; replace with an RPC for atomicity later).
    const { data: c } = await supabase
      .from("communities")
      .select("member_count")
      .eq("id", communityId)
      .single();
    if (c) {
      await supabase
        .from("communities")
        .update({ member_count: (c.member_count ?? 0) + 1 })
        .eq("id", communityId);
    }
    await awardXp(profile.id, "community_join", 15, communityId);
  }

  revalidatePath(`/app/communities/${slug}`);
  redirect(`/app/communities/${slug}`);
}

/** Post a message to a community discussion channel. Awards +5 XP. */
export async function sendMessage(formData: FormData) {
  const channelId = String(formData.get("channel_id"));
  const communityId = String(formData.get("community_id"));
  const slug = String(formData.get("slug"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  await supabase.from("channel_messages").insert({
    channel_id: channelId,
    author_id: profile.id,
    body,
  });

  await awardXp(profile.id, "channel_message", 5, communityId);
  revalidatePath(`/app/communities/${slug}`);
}
