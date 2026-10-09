import Link from "next/link";

/**
 * ASCENDR wordmark with a simple ascending-bars mark. Pure SVG, no image
 * request. `tone` switches it for dark backgrounds.
 */
export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const text = tone === "dark" ? "text-ink" : "text-white";
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${text}`} aria-label="ASCENDR home">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
        <rect width="26" height="26" rx="7" className={tone === "dark" ? "fill-ink" : "fill-white"} />
        <rect x="6" y="14" width="3.2" height="6" rx="1.2" className="fill-brand-300" />
        <rect x="11.4" y="10" width="3.2" height="10" rx="1.2" className="fill-brand-400" />
        <rect x="16.8" y="6" width="3.2" height="14" rx="1.2" className="fill-brand-500" />
      </svg>
      <span className="text-[19px] font-semibold tracking-[0.08em]">ASCENDR</span>
    </Link>
  );
}
