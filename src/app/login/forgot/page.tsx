import Link from "next/link";
import { Logo } from "@/components/home/Logo";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Reset your password | ASCENDR" };

export default async function ForgotPasswordPage(props: { searchParams: Promise<{ sent?: string; message?: string; error?: string }> }) {
  const sp = await props.searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-7 shadow-card">
        <Link href="/" aria-label="ASCENDR home">
          <Logo />
        </Link>
        <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Forgot password</p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink">Reset your password</h1>
        <p className="mt-1 text-[14px] text-text-secondary">Enter the email you signed up with and we&apos;ll send you a link to choose a new password.</p>

        {sp.sent && sp.message ? (
          <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] leading-relaxed text-emerald-800">
            {sp.message}
          </div>
        ) : null}
        {sp.error ? (
          <div role="alert" className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5 text-[13px] text-danger">
            {sp.error}
          </div>
        ) : null}

        <form action={requestPasswordReset} className="mt-6 space-y-3">
          <label htmlFor="email" className="block text-[13px] font-medium text-ink">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-text-secondary/70 focus:border-ink/40" />
          <button className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">Send reset link</button>
        </form>

        <p className="mt-6 text-center text-[13px] text-text-secondary">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
