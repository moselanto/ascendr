"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary, for errors thrown by the ROOT LAYOUT itself.
 *
 * error.tsx cannot catch those, because it renders inside the layout that
 * failed. This one replaces the whole document, which is why it must supply
 * its own <html> and <body>.
 *
 * It also cannot rely on globals.css having loaded — the failure may have
 * happened before styles were applied — so the styling here is inline on
 * purpose. Resist the urge to "tidy" it into Tailwind classes.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
          color: "#0F172A",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
            ASCENDR is temporarily unavailable
          </h1>
          <p style={{ marginTop: 12, fontSize: 16, color: "#64748B", lineHeight: 1.6 }}>
            Something failed while loading the application. Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 28,
              background: "#4F46E5",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 28, fontSize: 12, color: "#64748B" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
