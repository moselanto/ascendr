/**
 * Auth cookie attributes (SECURITY-AUDIT M-5), applied everywhere Supabase
 * session cookies are written: middleware, server client and browser client.
 *
 * - SameSite=Lax: cookies are not sent on cross-site POSTs, which blocks
 *   classic CSRF. Next.js Server Actions additionally reject requests whose
 *   Origin does not match the Host.
 * - Secure in production: cookies only travel over HTTPS (HSTS is also on).
 * - Path=/.
 * - HttpOnly stays OFF on purpose: the browser Supabase client (realtime chat,
 *   live rooms) reads the session from document.cookie. XSS exposure is
 *   limited by the enforcing Content-Security-Policy.
 */
export const IS_PROD = process.env.NODE_ENV === "production";

export function hardenCookie<T extends Record<string, unknown> | undefined>(options: T) {
  return { ...(options ?? {}), path: "/", sameSite: "lax" as const, secure: IS_PROD };
}
