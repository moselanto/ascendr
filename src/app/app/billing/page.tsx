import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { getTier, LIMITS } from "@/lib/usage";
import { PLAN_LABEL, PLAN_PRICE_KES, formatKes, isPaidPlan } from "@/lib/billing";
import { manageSubscription, cancelSubscription } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing | ASCENDR" };

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-emerald-50 text-emerald-800" },
  non_renewing: { label: "Cancels at period end", tone: "bg-amber-50 text-amber-800" },
  past_due: { label: "Payment failed, retrying", tone: "bg-amber-50 text-amber-800" },
  pending: { label: "Checkout not finished", tone: "bg-surface text-text-secondary" },
  cancelled: { label: "Cancelled", tone: "bg-surface text-text-secondary" },
};

export default async function BillingPage() {
  const profile = await getCurrentProfile();
  if (profile == null) redirect("/login?next=/app/billing");
  const supabase = createClient();
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, subscription_code")
    .eq("user_id", profile.id)
    .maybeSingle();
  const tier = await getTier(profile.id);
  const paid = tier === "starter" || tier === "pro";
  const st = sub ? STATUS[sub.status] ?? STATUS.pending : null;
  const renews = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Billing</p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
          Your <span className="accent-serif">plan</span>
        </h1>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[13px] text-amber-900">
          Billing needs one database update: run <code className="rounded bg-white/70 px-1.5 py-0.5">supabase/migrations/0017_billing.sql</code> in Supabase.
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white md:p-7">
        <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">Current plan</p>
            <p className="mt-2 text-[30px] font-semibold tracking-tight">
              {paid && isPaidPlan(tier) ? PLAN_LABEL[tier] : "Free"}
              {paid && isPaidPlan(tier) && <span className="ml-2 text-[16px] font-normal text-white/60">{formatKes(PLAN_PRICE_KES[tier])}/month</span>}
            </p>
            {sub && st && (
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${st.tone}`}>{st.label}</span>
            )}
            {paid && renews && (
              <p className="mt-2 text-[13px] text-white/70">
                {sub?.status === "non_renewing" ? `Access until ${renews}` : `Renews on ${renews}`}
              </p>
            )}
          </div>
          <Link href="/app/plans" className="w-fit rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-brand-50">
            {paid ? "Change plan" : "Upgrade"}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[16px] font-semibold text-ink">Your daily AI limits</h2>
        </div>
        <dl className="divide-y divide-border">
          {[
            ["AI coach messages", LIMITS["ai:coach"][tier]],
            ["Mock interviews", LIMITS["ai:interview"][tier]],
            ["Resume reviews", LIMITS["ai:resume-review"][tier]],
            ["AI career plans", LIMITS["ai:career-plan"][tier]],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex items-center justify-between px-5 py-3.5">
              <dt className="text-[14px] text-ink">{k}</dt>
              <dd className="nums text-[14px] font-semibold text-ink">{v} a day</dd>
            </div>
          ))}
        </dl>
      </section>

      {sub?.subscription_code && (sub.status === "active" || sub.status === "past_due" || sub.status === "non_renewing") && (
        <section className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-ink">Manage subscription</h2>
          <p className="mt-1 text-[13px] text-text-secondary">Update your card on Paystack&apos;s secure page, or cancel. Cancelling keeps your plan until the end of the period.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={manageSubscription}>
              <button className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">Update payment method</button>
            </form>
            {sub.status !== "non_renewing" && (
              <form action={cancelSubscription}>
                <button className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-danger/40 hover:text-danger">Cancel subscription</button>
              </form>
            )}
          </div>
        </section>
      )}

      <p className="text-center text-[12px] text-text-secondary">Payments are processed securely by Paystack. ASCENDR never stores your card details.</p>
    </div>
  );
}
