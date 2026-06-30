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

function channelName(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "channel"
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

  await supabase.from("community_members").insert({
    community_id: community.id,
    user_id: profile.id,
    role: "owner",
    status: "active",
  });
  // Seed with two starter channels.
  await supabase.from("community_channels").insert([
    { community_id: community.id, kind: "discussion", name: "general", position: 0 },
    { community_id: community.id, kind: "discussion", name: "introductions", position: 1 },
  ]);

  await awardXp(profile.id, "community_create", 25, community.id);
  redirect(`/app/communities/${community.slug}`);
}

/** Create an additional channel in a community (mods/owner only). */
export async function createChannel(formData: FormData) {
  const communityId = String(formData.get("community_id"));
  const slug = String(formData.get("slug"));
  const raw = String(formData.get("name") || "").trim();
  if (!raw) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  // Authorization: must be owner/moderator (RLS also enforces this).
  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!membership || !["owner", "moderator"].includes(membership.role)) {
    redirect(`/app/communities/${slug}`);
  }

  // Position = current channel count.
  const { count } = await supabase
    .from("community_channels")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId);

  const { data: created } = await supabase
    .from("community_channels")
    .insert({
      community_id: communityId,
      kind: "discussion",
      name: channelName(raw),
      position: count ?? 0,
    })
    .select("id")
    .single();

  revalidatePath(`/app/communities/${slug}`);
  redirect(`/app/communities/${slug}${created ? `?channel=${created.id}` : ""}`);
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

/** Post a message to a channel. Awards +5 XP + notifies the owner. */
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

  const { data: community } = await supabase
    .from("communities")
    .select("owner_id, name")
    .eq("id", communityId)
    .maybeSingle();
  if (community && community.owner_id !== profile.id) {
    await supabase.from("notifications").insert({
      user_id: community.owner_id,
      type: "message",
      actor_id: profile.id,
      entity_type: "community",
      entity_id: communityId,
      body: `${profile.full_name || "A member"} posted in ${community.name}`,
    });
  }

  await awardXp(profile.id, "channel_message", 5, communityId);
  revalidatePath(`/app/communities/${slug}`);
}

/** Toggle a reaction emoji on a message (add if absent, remove if present). */
export async function toggleReaction(
  messageId: string,
  emoji: string,
  communityId: string,
  slug: string
) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", profile.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", profile.id)
      .eq("emoji", emoji);
  } else {
    await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: profile.id, emoji });
  }
  revalidatePath(`/app/communities/${slug}`);
}

/** Record that the current user has read a channel up to now (drives unread badges). */
export async function markChannelRead(channelId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = createClient();
  await supabase
    .from("channel_reads")
    .upsert(
      { channel_id: channelId, user_id: profile.id, last_read_at: new Date().toISOString() },
      { onConflict: "channel_id,user_id" }
    );
}
