import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Send the member back to the page the form was submitted from, with a
 * `toast` message the <Toast /> component (in the /app layout) shows as a
 * pop-up confirmation. Only same-origin paths are used: the referer is
 * reduced to its pathname + query, so this can never redirect off-site.
 */
export function backWithToast(message: string, fallback = "/app"): never {
  let path = fallback;
  const ref = headers().get("referer");
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.pathname.startsWith("/")) path = u.pathname + u.search;
    } catch {
      path = fallback;
    }
  }
  const target = new URL(path, "http://local");
  target.searchParams.set("toast", message.slice(0, 120));
  redirect(target.pathname + target.search);
}
