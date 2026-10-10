import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { hardenCookie } from "./cookie-options";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client (uses the public anon key + user session cookies).
 * Use in server components, route handlers, and server actions.
 */
export function createClient() {
  const cookieStore = (/* Next 15: synchronous access kept on purpose (temporary); see PR notes. */ cookies() as unknown as UnsafeUnwrappedCookies);
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, hardenCookie(options))
            );
          } catch {
            // called from a Server Component — safe to ignore when middleware refreshes sessions
          }
        },
      },
    }
  );
}
