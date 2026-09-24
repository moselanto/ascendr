import Link from "next/link";
import { SIGNIN, SIGNUP } from "@/components/home/links";

/**
 * Header follows the reference pattern: wordmark left, navigation centred,
 * two actions right — a quiet outlined one and a filled primary. The previous
 * version pushed the nav hard against a small wordmark and left the right
 * side unbalanced.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-6xl items-center px-6">
        <Link
          href="/"
          className="text-[22px] font-extrabold tracking-tight text-text"
        >
          ASCEND<span className="text-primary">R</span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 text-[15px] font-medium text-text-secondary lg:flex">
          <a href="#questions" className="transition-colors hover:text-text">
            Why ASCENDR
          </a>
          <a href="#journey" className="transition-colors hover:text-text">
            How it works
          </a>
          <a href="#faq" className="transition-colors hover:text-text">
            FAQ
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href={SIGNIN}
            className="rounded-sm border border-border px-4 py-2 text-[15px] font-semibold text-text transition-colors hover:border-primary hover:text-primary"
          >
            Sign in
          </Link>
          <Link
            href={SIGNUP}
            className="rounded-sm bg-primary px-4 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
