/**
 * Security headers — closes the "no security headers" finding in
 * SECURITY-AUDIT.md.
 *
 * Applied at the edge by Vercel to every route, so there is nothing to
 * remember to add per-page and no way for a new route to miss them.
 *
 * On the Content-Security-Policy below: it is deliberately Report-Only for
 * now. See the note above the policy before switching it to enforcing.
 */

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
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
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
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig = {
  reactStrictMode: true,

  // Removes "X-Powered-By: Next.js". Minor, but there is no reason to
  // advertise the framework and version to a scanner.
  poweredByHeader: false,

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

export default nextConfig;
