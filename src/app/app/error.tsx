"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary for the authenticated product area.
 *
 * Separate from the root boundary because the recovery options differ: a
 * signed-in user who hits a failure wants back into the product, not back to
 * the marketing homepage.
 *
 * This is where most failures will surface in practice — everything under
 * /app reads from Supabase, so a dropped connection, an expired session, or a
 * policy change all land here rather than on the public site.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with Sentry.captureException(error) once monitoring lands
    // (SECURITY-AUDIT.md M-2).
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
          Something went wrong
        </p>
        <h1 className="mt-3 text-h3 font-bold">We couldn&apos;t load this</h1>
        <p className="mt-3 text-small text-text-secondary">
          Your data is safe. This is a problem loading the page, not a problem with your
          account.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="w-full rounded-sm bg-primary px-6 py-3 text-body font-semibold text-white hover:opacity-95 sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/app"
            className="w-full rounded-sm border border-border bg-card px-6 py-3 text-body font-semibold text-text hover:border-primary sm:w-auto"
          >
            Back to dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-7 text-caption text-text-secondary">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
