import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { resolveNotificationTarget, type NotifRow } from "@/lib/notifications";

/** Open a notification: mark it read, then go to what it is about. */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const origin = new URL(req.url).origin;
  const profile = await getCurrentProfile();
  if (profile == null) return NextResponse.redirect(new URL("/login", origin));

  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, actor_id, entity_type, entity_id")
    .eq("id", params.id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (data == null) return NextResponse.redirect(new URL("/app/notifications", origin));

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("read_at", null);

  const target = await resolveNotificationTarget(supabase, data as NotifRow);
  return NextResponse.redirect(new URL(target, origin));
}
