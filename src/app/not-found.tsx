import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-5">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-card">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">404</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
          This page <span className="accent-serif">doesn&apos;t exist</span>
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
          The link may be out of date, or the page may have moved.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-700 sm:w-auto"
          >
            Back to home
          </Link>
          <Link
            href="/app"
            className="w-full rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink/30 sm:w-auto"
          >
            Go to your dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
