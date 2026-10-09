/**
 * Return-after-login guard.
 *
 * Only same-origin relative paths are allowed as a post-auth destination:
 * the value must start with a single "/" and not "//" or "/\" (both of which
 * browsers treat as protocol-relative URLs to another host). Anything else
 * falls back, which prevents open redirects through ?next=.
 */
export function safeNext(raw: unknown, fallback = "/app"): string {
  if (typeof raw \!== "string") return fallback;
  const value = raw.trim();
  if (value.length === 0 || value.length > 2048) return fallback;
  if (\!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Reject control characters (e.g. encoded newlines/tabs) outright.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
