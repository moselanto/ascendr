"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

/**
 * Route-segment error boundary for the public site.
 *
 * We deliberately show the user nothing but the digest: a short hash Next
 * generates for the error. It is safe to display and lets support tie a
 * report to a server log line without putting a stack trace on screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with Sentry.captureException(error) once monitoring lands
    // (SECURITY-AUDIT.md M-2). Until then this at least reaches Vercel logs.
    console.error("Unhandled error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-card">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Something went wrong</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
          This page didn&apos;t <span className="accent-serif">load</span>
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
          The problem is on our side, not yours. Trying again usually works.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-700 sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink/30 sm:w-auto"
          >
            Back to home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-7 text-[12px] text-text-secondary">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
