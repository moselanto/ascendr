import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addMonth, isPaidPlan, planFromCode } from "@/lib/billing";

/**
 * Paystack webhook. Set the URL in Paystack > Settings > API Keys & Webhooks:
 *   https://<your-domain>/api/paystack/webhook
 * Every request is verified with the HMAC-SHA512 signature of the raw body.
 */
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (secret.length === 0 || sig.length !== expected.length ||
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) === false) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const evt = JSON.parse(raw) as { event: string; data: Record<string, any> };
  const d = evt.data ?? {};
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Replay protection (migration 0021): record each verified body once.
  // A duplicate delivery is acknowledged with 200 so Paystack stops retrying.
  const eventId = crypto.createHash("sha256").update(raw).digest("hex");
  const claim = await admin
    .from("paystack_events")
    .insert({ id: eventId, event: String(evt.event ?? ""), reference: d.reference ?? null });
  if (claim.error) {
    if (claim.error.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    // Table missing (0021 not run) or a transient error: process anyway, but say so.
    console.warn("paystack webhook: could not record event, processing without replay protection", claim.error.message);
  }
  const claimed = claim.error == null;
  // If processing fails after the claim, release it so Paystack's retry is processed.
  const release = async () => {
    if (claimed) await admin.from("paystack_events").delete().eq("id", eventId);
  };

  // Find the member: metadata first, then customer code, then email.
  async function findUser(): Promise<string | null> {
    const metaId = d.metadata?.profile_id;
    if (typeof metaId === "string" && metaId.length > 0) return metaId;
    const code = d.customer?.customer_code ?? d.subscription?.customer?.customer_code;
    if (code) {
      const { data } = await admin.from("subscriptions").select("user_id").eq("customer_code", code).maybeSingle();
      if (data) return data.user_id;
    }
    const subCode = d.subscription_code ?? d.subscription?.subscription_code;
    if (subCode) {
      const { data } = await admin.from("subscriptions").select("user_id").eq("subscription_code", subCode).maybeSingle();
      if (data) return data.user_id;
    }
    const email = String(d.customer?.email ?? "").toLowerCase();
    if (email) {
      const { data } = await admin.from("subscriptions").select("user_id").ilike("email", email).maybeSingle();
      if (data) return data.user_id;
    }
    return null;
  }

  const userId = await findUser();
  if (userId == null) return NextResponse.json({ ok: true, skipped: "unknown customer" });

  const plan = planFromCode(d.plan?.plan_code ?? d.subscription?.plan?.plan_code) ?? (isPaidPlan(d.metadata?.plan) ? d.metadata.plan : null);
  const base: Record<string, unknown> = { user_id: userId, updated_at: now };
  if (plan) base.plan = plan;
  if (d.customer?.customer_code) base.customer_code = d.customer.customer_code;
  if (d.customer?.email) base.email = String(d.customer.email).toLowerCase();

  let patch: Record<string, unknown> | null = null;
  switch (evt.event) {
    case "charge.success":
      patch = { ...base, status: "active", current_period_end: addMonth(), last_reference: d.reference ?? null };
      break;
    case "subscription.create":
      patch = {
        ...base,
        status: "active",
        subscription_code: d.subscription_code ?? null,
        email_token: d.email_token ?? null,
        current_period_end: d.next_payment_date ?? addMonth(),
      };
      break;
    case "subscription.not_renew":
      patch = { ...base, status: "non_renewing" };
      break;
    case "subscription.disable":
      patch = { ...base, status: "cancelled" };
      break;
    case "invoice.payment_failed":
      patch = { ...base, status: "past_due" };
      break;
    default:
      return NextResponse.json({ ok: true, ignored: evt.event });
  }

  // Inserts need a plan; skip events we can't attribute to one.
  const { data: existing } = await admin.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
  if (existing == null && patch.plan == null) return NextResponse.json({ ok: true, skipped: "no plan" });
  const { error } = await admin.from("subscriptions").upsert(patch, { onConflict: "user_id" });
  if (error) {
    await release();
    return new NextResponse(error.message, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
