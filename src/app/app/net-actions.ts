"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { backWithToast } from "@/lib/toast";
import { cleanAttachments } from "@/lib/chat";

/** Send a connection request to another profile. */
export async function sendConnectionRequest(formData: FormData) {
  const addresseeId = String(formData.get("addressee_id") || "");
  if (!addresseeId) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (addresseeId === profile.id) return;

  const supabase = createClient();
  // Avoid duplicates in either direction; if a row exists, leave it.
  const { data: existing } = await supabase
    .from("connections")
    .select("id, status")
    .or(
      `and(requester_id.eq.${profile.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${profile.id})`
    )
    .maybeSingle();
  if (existing == null) {
    const { error } = await supabase.from("connections").insert({
      requester_id: profile.id,
      addressee_id: addresseeId,
      status: "pending",
    });
    if (error == null) {
      await supabase.from("notifications").insert({
        user_id: addresseeId,
        type: "connection_request",
        actor_id: profile.id,
        entity_type: "profile",
        entity_id: profile.id,
        body: `${profile.full_name || "Someone"} wants to connect with you`,
      });
    }
  }
  revalidatePath("/app/networking");
  revalidatePath(`/app/members/${addresseeId}`);
  revalidatePath("/app/members");
  revalidatePath("/app/mentors");
  backWithToast(existing ? "You are already connected or have a request pending" : "Connection request sent", "/app/members");
}

/** Accept or decline an incoming connection request (addressee only). */
export async function respondToConnection(formData: FormData) {
  const connectionId = String(formData.get("connection_id") || "");
  const decision = String(formData.get("decision") || "");
  if (!connectionId || !["accepted", "declined"].includes(decision)) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  // RLS ensures only a party to the connection can update; also require the
  // caller be the addressee of a pending request.
  const { data: updated } = await supabase
    .from("connections")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("addressee_id", profile.id)
    .eq("status", "pending")
    .select("requester_id")
    .maybeSingle();

  if (updated && decision === "accepted") {
    await supabase.from("notifications").insert({
      user_id: updated.requester_id,
      type: "connection_accepted",
      actor_id: profile.id,
      entity_type: "profile",
      entity_id: profile.id,
      body: `${profile.full_name || "Someone"} accepted your connection request`,
    });
  }

  revalidatePath("/app/networking");
  revalidatePath("/app", "layout");
  backWithToast(decision === "accepted" ? "Connection accepted" : "Request declined", "/app/networking");
}

/** Send a direct message to another profile. */
export async function sendDirectMessage(formData: FormData) {
  const recipientId = String(formData.get("recipient_id") || "");
  const body = String(formData.get("body") || "").trim();
  if (recipientId.length === 0) return { ok: false as const, error: "No recipient" };

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (recipientId === profile.id) return { ok: false as const, error: "Cannot message yourself" };

  const supabase = createClient();
  const attachments = cleanAttachments(formData.get("attachments"), profile.auth_user_id);
  if (body.length === 0 && attachments.length === 0) return { ok: false as const, error: "Empty message" };
  const row: Record<string, unknown> = {
    sender_id: profile.id,
    recipient_id: recipientId,
    body: body.length ? body.slice(0, 4000) : null,
  };
  if (attachments.length) row.attachments = attachments;
  const { error } = await supabase.from("direct_messages").insert(row);
  if (error) return { ok: false as const, error: error.message };

  // Notify the recipient, once per unread conversation (no spam per message).
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", recipientId)
    .eq("type", "dm")
    .eq("actor_id", profile.id)
    .is("read_at", null);
  if ((count ?? 0) === 0) {
    await supabase.from("notifications").insert({
      user_id: recipientId,
      type: "dm",
      actor_id: profile.id,
      entity_type: "profile",
      entity_id: profile.id,
      body: `${profile.full_name || "Someone"} sent you a message`,
    });
  }

  revalidatePath("/app/networking");
  return { ok: true as const };
}

/** Mark all messages from a given sender as read (recipient = current user). */
export async function markDmRead(senderId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = createClient();
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", senderId)
    .eq("recipient_id", profile.id)
    .is("read_at", null);
  // Opening the conversation also clears its message notification.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .eq("type", "dm")
    .eq("actor_id", senderId)
    .is("read_at", null);
  revalidatePath("/app", "layout");
}

/** Toggle my emoji reaction on a direct message. */
export async function toggleDmReaction(messageId: string, emoji: string) {
  const profile = await getCurrentProfile();
  if (profile == null || emoji.length === 0 || emoji.length > 16) return;
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("dm_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", profile.id)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existing) {
    await supabase.from("dm_reactions").delete().eq("message_id", messageId).eq("user_id", profile.id).eq("emoji", emoji);
  } else {
    await supabase.from("dm_reactions").insert({ message_id: messageId, user_id: profile.id, emoji });
  }
}
