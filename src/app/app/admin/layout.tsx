import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { requireAdminMfa } from "@/lib/mfa";
import AdminTabs from "./_components/AdminTabs";

export const dynamic = "force-dynamic";

/**
 * Platform admin console shell. Every route under /app/admin is restricted to
 * ASCENDR staff (profiles.role = 'admin'). Everyone else gets a 404 rather
 * than a 403 so the console's existence is not advertised.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();
  // Admins must pass two-factor sign-in (aal2) to use the console.
  await requireAdminMfa();

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="rounded-2xl border border-border bg-white p-1.5 shadow-card sm:inline-flex">
        <AdminTabs />
      </div>
      <div>{children}</div>
    </div>
  );
}
