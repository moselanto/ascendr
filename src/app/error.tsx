"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-segment error boundary for the public site.
 *
 * Before this existed, any throw in a Server Component produced an unstyled
 * Next.js failure page. Beyond the UX, the default surface can expose more
 * about the failure than it should depending on configuration.
 *
 * We deliberately show the user nothing but the digest — a short hash Next
 * generates for the error. It is safe to display, and it lets support tie a
 * report to a specific server log line without ever putting a stack trace or
 * a message on screen.
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
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-text">
      <div className="w-full max-w-md text-center">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
          Something went wrong
        </p>
        <h1 className="mt-3 text-h2 font-bold">This page didn&apos;t load</h1>
        <p className="mt-3 text-body text-text-secondary">
          The problem is on our side, not yours. Trying again usually works.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="w-full rounded-sm bg-primary px-6 py-3 text-body font-semibold text-white hover:opacity-95 sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full rounded-sm border border-border bg-card px-6 py-3 text-body font-semibold text-text hover:border-primary sm:w-auto"
          >
            Back to home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-caption text-text-secondary">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
