"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

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
  if (!existing) {
    await supabase.from("connections").insert({
      requester_id: profile.id,
      addressee_id: addresseeId,
      status: "pending",
    });
  }
  revalidatePath("/app/networking");
  revalidatePath(`/app/members/${addresseeId}`);
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
  await supabase
    .from("connections")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("addressee_id", profile.id)
    .eq("status", "pending");

  revalidatePath("/app/networking");
}

/** Send a direct message to another profile. */
export async function sendDirectMessage(formData: FormData) {
  const recipientId = String(formData.get("recipient_id") || "");
  const body = String(formData.get("body") || "").trim();
  if (!recipientId || !body) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (recipientId === profile.id) return;

  const supabase = createClient();
  await supabase.from("direct_messages").insert({
    sender_id: profile.id,
    recipient_id: recipientId,
    body,
  });

  // Notify the recipient.
  await supabase.from("notifications").insert({
    user_id: recipientId,
    type: "dm",
    actor_id: profile.id,
    entity_type: "profile",
    entity_id: profile.id,
    body: `${profile.full_name || "Someone"} sent you a message`,
  });

  revalidatePath(`/app/networking?dm=${recipientId}`);
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
}
