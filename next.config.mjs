/**
 * Security headers — closes the "no security headers" finding in
 * SECURITY-AUDIT.md.
 *
 * Applied at the edge by Vercel to every route, so there is nothing to
 * remember to add per-page and no way for a new route to miss them.
 *
 * The Content-Security-Policy below is ENFORCING (switched from Report-Only
 * on 10 Oct 2026). To roll back, rename the key to
 * "Content-Security-Policy-Report-Only" and redeploy.
 */

import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */

// Anything that must load cross-origin goes here so the policy stays readable.
// OpenAI is absent on purpose: it is only ever called server-side, so the
// browser never needs to reach it.
const SUPABASE = "https://*.supabase.co wss://*.supabase.co";

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required because Next injects inline bootstrap and
  // hydration scripts. Removing it needs nonce-based CSP via middleware,
  // which is the upgrade path once this policy reports clean.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind and next/font both emit inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  // Fonts are self-hosted by next/font, so no third-party font origin.
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  // Chat videos are served from Supabase Storage; previews use blob: URLs.
  "media-src 'self' blob: https://*.supabase.co",
  // YouTube links in chat render as privacy-enhanced embeds.
  "frame-src https://www.youtube-nocookie.com",
  `connect-src 'self' ${SUPABASE}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Force HTTPS for two years, including subdomains. Safe on Vercel, which
  // serves HTTPS only. Do NOT add `preload` until the domain is final —
  // getting off the HSTS preload list is slow and painful.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  // Stops the browser second-guessing declared MIME types, which is how an
  // uploaded file gets executed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking. Duplicated by frame-ancestors in the CSP above, kept for
  // older browsers that ignore it.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the full URL only to ourselves; cross-origin gets the origin alone.
  // Matters here because authenticated URLs can carry plan and profile ids.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in ASCENDR uses these, so deny them outright.
  {
    key: "Permissions-Policy",
    // Camera and microphone are allowed for this site only: hosts use them to
    // go live in community sessions. Third-party frames still get neither.
    value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // REPORT-ONLY, on purpose.
  //
  // An enforcing CSP that is even slightly wrong takes the site down, and
  // this one has not yet been observed against real traffic. Report-Only
  // applies the same policy and logs violations without blocking anything.
  //
  // To promote it: watch the browser console on the live site for a few days
  // of normal use, fix whatever legitimately reports, then rename this key to
  // "Content-Security-Policy". Do that as its own change, not bundled with
  // anything else, so a rollback is one revert.
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  reactStrictMode: true,

  // Removes "X-Powered-By: Next.js". Minor, but there is no reason to
  // advertise the framework and version to a scanner.
  poweredByHeader: false,

  // Turns off Next's image optimisation endpoint (/_next/image). Next 14 has
  // open advisories in it, including a critical remote-code-execution issue
  // with AVIF files, fixed only in Next 15.5.24+. Images (profile photos) are
  // small and served from Supabase storage, so they load directly instead.
  // Remove this once Next is upgraded.
  images: { unoptimized: true },

  async headers() {
    return [
      {
        // Every route, including API routes and static assets.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry (SECURITY-AUDIT M-2). Inert until NEXT_PUBLIC_SENTRY_DSN is set.
// Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and
// SENTRY_PROJECT are set; otherwise the build skips that step.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
