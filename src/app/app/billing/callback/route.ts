import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { addMonth, isPaidPlan, paystack, PLAN_LABEL, upsertSubscription } from "@/lib/billing";

type Verify = {
  status: string;
  reference: string;
  metadata: { profile_id?: string; plan?: string } | null;
  customer: { customer_code: string; email: string } | null;
};

/** Paystack redirects here after checkout. Verify the payment, then activate the plan. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref") ?? "";
  const back = (msg: string) => NextResponse.redirect(new URL(`/app/billing?toast=${encodeURIComponent(msg)}`, url.origin));

  const profile = await getCurrentProfile();
  if (profile == null) return NextResponse.redirect(new URL("/login?next=/app/billing", url.origin));
  if (reference.length === 0) return back("Payment reference missing");

  const res = await paystack<Verify>(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (res.status === false || res.data?.status !== "success") return back("Payment was not completed");

  const meta = res.data.metadata ?? {};
  if (meta.profile_id !== profile.id || isPaidPlan(meta.plan) === false) return back("This payment belongs to another account");

  // A Plus renewal paid before the period ends adds a month on top of the time left.
  const { data: existing } = await createClient()
    .from("subscriptions")
    .select("plan, current_period_end, last_reference")
    .eq("user_id", profile.id)
    .maybeSingle();
  const left = existing?.plan === meta.plan && existing.current_period_end ? new Date(existing.current_period_end) : null;
  const from = left && left.getTime() > Date.now() ? left : new Date();
  const alreadyApplied = existing?.last_reference === res.data.reference && left != null && left.getTime() > Date.now() && meta.plan === "plus";
  await upsertSubscription({
    user_id: profile.id,
    plan: meta.plan,
    status: "active",
    email: res.data.customer?.email?.toLowerCase() ?? null,
    customer_code: res.data.customer?.customer_code ?? null,
    current_period_end: alreadyApplied ? existing?.current_period_end : addMonth(meta.plan === "plus" ? from : new Date()),
    last_reference: res.data.reference,
  });
  return back(`Welcome to ${PLAN_LABEL[meta.plan]}. Your new limits are active`);
}
