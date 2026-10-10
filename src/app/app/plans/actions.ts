"use server";

import { getCurrentProfile } from "@/lib/data";
import { track } from "@/lib/analytics";
import { backWithToast } from "@/lib/toast";

/** Register interest in Pro early access (no billing yet). */
export async function joinProEarlyAccess(formData: FormData) {
  const profile = await getCurrentProfile();
  const plan = String(formData.get("plan") ?? "pro").slice(0, 20);
  await track("pro_interest", { userId: profile?.id ?? null, props: { plan } });
  const msg =
    plan === "custom"
      ? "Thanks. Our team will contact you about a custom plan"
      : plan === "starter"
        ? "You're on the Starter early-access list"
        : "You're on the Pro early-access list";
  return backWithToast(msg, "/app/plans");
}
