import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "../safe-next";
import { MfaChallenge } from "./MfaChallenge";

export const dynamic = "force-dynamic";

export default async function MfaPage(props: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await props.searchParams;
  const next = safeNext(rawNext, "/app");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user == null) redirect(`/login?next=${encodeURIComponent(next)}`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-7 shadow-card">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Two-factor sign-in</p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink">Enter your code</h1>
        <p className="mt-1 text-[14px] text-text-secondary">Open your authenticator app and type the 6-digit code for ASCENDR.</p>
        <MfaChallenge next={next} />
        <p className="mt-5 text-center text-[12px] text-text-secondary">
          Lost your phone? <Link href="/app" className="font-medium text-ink hover:underline">Continue without admin access</Link>
        </p>
      </div>
    </main>
  );
}
