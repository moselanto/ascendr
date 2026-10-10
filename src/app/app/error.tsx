"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

/**
 * Error boundary for the authenticated product area.
 *
 * Separate from the root boundary because the recovery options differ: a
 * signed-in user who hits a failure wants back into the product, not back to
 * the marketing homepage. Only the digest is shown, never a message or stack.
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
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-card">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Something went wrong</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-ink">
          We couldn&apos;t load <span className="accent-serif">this page</span>
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
          Your data is safe. This is a problem loading the page, not a problem with your account.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-700 sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/app"
            className="w-full rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink/30 sm:w-auto"
          >
            Back to dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-7 text-[12px] text-text-secondary">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
