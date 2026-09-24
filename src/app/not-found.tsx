import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-text">
      <div className="w-full max-w-md text-center">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
          404
        </p>
        <h1 className="mt-3 text-h2 font-bold">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-body text-text-secondary">
          The link may be out of date, or the page may have moved.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="w-full rounded-sm bg-primary px-6 py-3 text-body font-semibold text-white hover:opacity-95 sm:w-auto"
          >
            Back to home
          </Link>
          <Link
            href="/app"
            className="w-full rounded-sm border border-border bg-card px-6 py-3 text-body font-semibold text-text hover:border-primary sm:w-auto"
          >
            Go to your dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
