"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { track } from "@/lib/analytics";
import { backWithToast } from "@/lib/toast";
import { appUrl, billingConfigured, isPaidPlan, paystack, planCode, PLAN_PRICE_KES, BILLING_CURRENCY, upsertSubscription } from "@/lib/billing";

/** Start a Paystack checkout for Starter or Pro. Falls back to early-access interest if billing isn't configured. */
export async function startCheckout(formData: FormData) {
  const plan = String(formData.get("plan") ?? "");
  if (isPaidPlan(plan) === false) return;
  const profile = await getCurrentProfile();
  if (profile == null) redirect("/login?next=/app/pro");

  if (billingConfigured() === false) {
    await track("pro_interest", { userId: profile.id, props: { plan } });
    backWithToast("Payments open soon. You're on the early-access list", "/app/pro");
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email;
  if (email == null) backWithToast("Your account has no email address for billing", "/app/pro");

  const origin = headers().get("origin") ?? undefined;
  const res = await paystack<{ authorization_url: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email,
      amount: PLAN_PRICE_KES[plan] * 100,
      currency: BILLING_CURRENCY,
      plan: planCode(plan),
      callback_url: `${appUrl(origin)}/app/billing/callback`,
      metadata: { profile_id: profile.id, plan },
    },
  });
  if (res.status === false || res.data == null) {
    backWithToast(`Checkout could not start: ${res.message}`, "/app/pro");
  }

  await upsertSubscription({ user_id: profile.id, plan, status: "pending", email: email?.toLowerCase(), last_reference: res.data.reference });
  await track("pro_interest", { userId: profile.id, props: { plan, step: "checkout_started" } });
  redirect(res.data.authorization_url);
}

/** Open Paystack's hosted page to update the card or cancel. */
export async function manageSubscription() {
  const profile = await getCurrentProfile();
  if (profile == null) redirect("/login?next=/app/billing");
  const supabase = createClient();
  const { data: sub } = await supabase.from("subscriptions").select("subscription_code").eq("user_id", profile.id).maybeSingle();
  if (sub?.subscription_code == null) backWithToast("No active subscription to manage yet", "/app/billing");
  const res = await paystack<{ link: string }>(`/subscription/${sub.subscription_code}/manage/link`);
  if (res.status === false || res.data?.link == null) backWithToast(`Could not open billing: ${res.message}`, "/app/billing");
  redirect(res.data.link);
}

/** Cancel at the end of the current period. */
export async function cancelSubscription() {
  const profile = await getCurrentProfile();
  if (profile == null) redirect("/login?next=/app/billing");
  const supabase = createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, subscription_code, email_token")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (sub?.subscription_code == null || sub.email_token == null) backWithToast("No active subscription to cancel", "/app/billing");
  const res = await paystack<unknown>("/subscription/disable", {
    method: "POST",
    body: { code: sub.subscription_code, token: sub.email_token },
  });
  if (res.status === false) backWithToast(`Could not cancel: ${res.message}`, "/app/billing");
  await upsertSubscription({ user_id: profile.id, plan: sub.plan, status: "non_renewing" });
  backWithToast("Subscription cancelled. You keep your plan until the end of this period", "/app/billing");
}
