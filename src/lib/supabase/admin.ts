import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * Only for work that must run outside a user's permissions:
 *   - writing analytics_events (RLS-enabled with no policies, so deny-all)
 *   - vector retrieval over ai_chunks
 *   - quota accounting
 *
 * NEVER import this from a Client Component, and never pass anything derived
 * from it to one. There is a runtime guard below, but the guard is a safety
 * net, not the rule — a build that trips it has already leaked the key into a
 * client bundle.
 *
 * If you need data on behalf of a signed-in user, use @/lib/supabase/server
 * instead. RLS is the authorization layer (ARCHITECTURE.md section 4); reaching
 * for this client to "make a query work" is almost always the wrong fix.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() was called in the browser. The service role key must never reach the client."
    );
    }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for the admin client."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
