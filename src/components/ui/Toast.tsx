"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Pop-up confirmation driven by a `toast` search param.
 *
 * Server actions redirect to `...?toast=Network%20created`; this shows the
 * message as a bottom-centre pill for 3.5s, then strips the param from the URL
 * with router.replace (no scroll) so a refresh does not replay it.
 * Mount once, inside <Suspense> (useSearchParams requires it).
 */
export default function Toast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const message = params.get("toast");
  const [visible, setVisible] = useState<string | null>(null);

  useEffect(() => {
    if (\!message) return;
    setVisible(message.slice(0, 140));
    const t = setTimeout(() => {
      setVisible(null);
      const rest = new URLSearchParams(params.toString());
      rest.delete("toast");
      const qs = rest.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 3500);
    return () => clearTimeout(t);
  }, [message, params, pathname, router]);

  if (\!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8"
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] text-white shadow-lift">
        <span aria-hidden>{"\u2713"}</span>
        <span>{visible}</span>
      </div>
    </div>
  );
}
