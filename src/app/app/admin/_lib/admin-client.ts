import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-only helpers for the platform admin console.
 *
 * Only import this from Server Components under /app/admin. The service-role
 * client bypasses RLS; nothing it returns may be passed to a Client Component
 * beyond plain, already-rendered values.
 */

export type AdminClient = ReturnType<typeof createAdminClient>;

/** Returns the service-role client, or null when the env vars are missing. */
export function tryAdminClient(): AdminClient | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function daysAgoDate(days: number): string {
  return daysAgoIso(days).slice(0, 10);
}

/** Supabase embeds can come back as an object or a single-element array. */
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}
