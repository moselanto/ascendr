import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/home/Logo";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "../actions";

export const metadata = { title: "Choose a new password | ASCENDR" };
export const dynamic = "force-dynamic";

/** Reached from the emailed reset link (via /auth/callback, which signs the member in). */
export default async function ResetPasswordPage(props: { searchParams: Promise<{ error?: string }> }) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user == null) redirect("/login/forgot?error=" + encodeURIComponent("That reset link has expired. Request a new one."));

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-7 shadow-card">
        <Link href="/" aria-label="ASCENDR home">
          <Logo />
        </Link>
        <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">New password</p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink">Choose a new password</h1>
        <p className="mt-1 text-[14px] text-text-secondary">For {user.email}. Use at least 8 characters.</p>

        {sp.error ? (
          <div role="alert" className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5 text-[13px] text-danger">
            {sp.error}
          </div>
        ) : null}

        <form action={updatePassword} className="mt-6 space-y-3">
          <input type="hidden" name="from" value="reset" />
          <label htmlFor="password" className="block text-[13px] font-medium text-ink">
            New password
          </label>
          <input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-text-secondary/70 focus:border-ink/40" />
          <label htmlFor="confirm" className="block text-[13px] font-medium text-ink">
            Confirm new password
          </label>
          <input id="confirm" name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-text-secondary/70 focus:border-ink/40" />
          <button className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">Save new password</button>
        </form>

        <p className="mt-6 text-center text-[13px] text-text-secondary">
          <Link href="/app" className="font-medium text-ink underline-offset-4 hover:underline">
            Skip for now
          </Link>
        </p>
      </div>
    </main>
  );
}
