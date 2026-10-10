import * as Sentry from "@sentry/nextjs";

// Browser errors (SECURITY-AUDIT M-2). Sent through /monitoring on our own
// domain (tunnelRoute in next.config.mjs), so the CSP needs no new origin.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Off until a DSN is set, so local and preview builds send nothing.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Never attach cookies, IPs or request bodies: career data is personal.
  sendDefaultPii: false,
});
