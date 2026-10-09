"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { track } from "@/lib/analytics";

const STAGES = new Set(["saved", "applied", "interviewing", "offer", "closed"]);

function clean(v: FormDataEntryValue | null, max = 300) {
  return String(v ?? "").trim().slice(0, max);
}

/** Save a role to the member's tracker. Idempotent on (user, external id). */
export async function saveOpportunity(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile == null) return;
  const externalId = clean(formData.get("external_id"), 200);
  const title = clean(formData.get("title"));
  const company = clean(formData.get("company"), 200);
  if (externalId.length === 0 || title.length === 0 || company.length === 0) return;

  const supabase = createClient();
  await supabase.from("saved_opportunities").upsert(
    {
      user_id: profile.id,
      external_id: externalId,
      title,
      company,
      location: clean(formData.get("location"), 200) || null,
      url: clean(formData.get("url"), 500) || null,
      source: clean(formData.get("source"), 30) || null,
    },
    { onConflict: "user_id,external_id", ignoreDuplicates: true }
  );
  await track("opportunity_viewed", { userId: profile.id, props: { action: "saved" } });
  revalidatePath("/app/opportunities");
}

/**
 * Move a saved role to a new stage. Moving to "applied" also writes a
 * career action (application_sent) so it counts toward activation.
 */
export async function moveOpportunity(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile == null) return;
  const id = clean(formData.get("id"), 60);
  const status = clean(formData.get("status"), 20);
  if (id.length === 0 || STAGES.has(status) === false) return;

  const supabase = createClient();
  const { data: row } = await supabase
    .from("saved_opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", profile.id)
    .select("title, company")
    .maybeSingle();

  if (row && status === "applied") {
    await supabase.from("career_actions").insert({
      user_id: profile.id,
      kind: "application_sent",
      title: `Applied: ${row.title} at ${row.company}`.slice(0, 200),
      related_type: "opportunity",
      status: "completed",
      suggested_by: "user",
    });
    await track("opportunity_applied", { userId: profile.id });
  }
  revalidatePath("/app/opportunities");
  revalidatePath("/app");
}

export async function removeOpportunity(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile == null) return;
  const id = clean(formData.get("id"), 60);
  if (id.length === 0) return;
  const supabase = createClient();
  await supabase.from("saved_opportunities").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/app/opportunities");
}
