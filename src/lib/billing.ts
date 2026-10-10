import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paystack billing helpers (server only).
 *
 * Env:
 *   PAYSTACK_SECRET_KEY      sk_test_... / sk_live_...
 *   PAYSTACK_PLAN_STARTER    plan code for Starter ($99/month)
 *   PAYSTACK_PLAN_PRO        plan code for Pro ($199/month)
 *   NEXT_PUBLIC_APP_URL      e.g. https://ascendr-two.vercel.app
 */

export type PaidPlan = "starter" | "pro";

export const PLAN_LABEL: Record<PaidPlan, string> = { starter: "Starter", pro: "Pro" };
export const PLAN_PRICE_USD: Record<PaidPlan, number> = { starter: 99, pro: 199 };

export function isPaidPlan(v: unknown): v is PaidPlan {
  return v === "starter" || v === "pro";
}

export function planCode(plan: PaidPlan): string | null {
  const code = plan === "starter" ? process.env.PAYSTACK_PLAN_STARTER : process.env.PAYSTACK_PLAN_PRO;
  return code && code.trim().length > 0 ? code.trim() : null;
}

export function planFromCode(code: string | null | undefined): PaidPlan | null {
  if (code == null) return null;
  if (code === process.env.PAYSTACK_PLAN_STARTER) return "starter";
  if (code === process.env.PAYSTACK_PLAN_PRO) return "pro";
  return null;
}

export function billingConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && planCode("starter") && planCode("pro"));
}

export function appUrl(fallbackOrigin?: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || "https://ascendr-two.vercel.app").replace(/\/$/, "");
}

type PaystackResponse<T> = { status: boolean; message: string; data: T };

export async function paystack<T>(path: string, init?: { method?: string; body?: unknown }): Promise<PaystackResponse<T>> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as PaystackResponse<T> | null;
  if (json == null) return { status: false, message: `Paystack error ${res.status}`, data: null as T };
  return json;
}

export function addMonth(from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/** Service-role writer for the subscriptions table. */
export async function upsertSubscription(row: Record<string, unknown> & { user_id: string }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) console.warn("billing: upsert failed", error.message);
}
