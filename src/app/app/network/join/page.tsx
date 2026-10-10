import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "../actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  vc_fund: "VC fund",
  accelerator: "Accelerator",
  university: "University",
  association: "Association",
  company: "Company",
  other: "Network",
};

export default async function JoinNetworkPage({ searchParams }: { searchParams: { code?: string; error?: string } }) {
  const code = (searchParams.code ?? "").trim();
  const supabase = createClient();
  const { data } = code ? await supabase.rpc("org_invite_preview", { p_code: code }) : { data: null };
  const inv = ((data ?? []) as { organization_id: string; organization_name: string; kind: string; valid: boolean }[])[0];

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-card">
        {inv && inv.valid ? (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">{KIND_LABEL[inv.kind] ?? "Network"} invitation</p>
            <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-ink">Join {inv.organization_name} on ASCENDR</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
              Its admins will see your goal, your readiness for the roles they hire for, and the outcomes you log. You can switch sharing off
              or leave at any time.
            </p>
            {searchParams.error === "full" ? (
              <p className="mt-3 text-[13px] text-danger">This network is full on its current plan. Ask its admin to upgrade, then try the link again.</p>
            ) : searchParams.error ? (
              <p className="mt-3 text-[13px] text-danger">That invite could not be used. Ask for a new link.</p>
            ) : null}
            <form action={acceptInvite} className="mt-6">
              <input type="hidden" name="code" value={code} />
              <button className="w-full rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-white hover:bg-ink-700">Join {inv.organization_name}</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-semibold text-ink">This invite link isn&apos;t valid</h1>
            <p className="mt-2 text-[14px] text-text-secondary">It may have expired or been revoked. Ask the network admin for a new one.</p>
            <Link href="/app" className="mt-6 inline-flex rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink">
              Go to my dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
