import Link from "next/link";
import { SIGNIN, SIGNUP } from "@/components/home/links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
        <Link
          href="/"
          className="font-display text-xl font-extrabold tracking-tight"
        >
          ASCEND<span className="text-primary">R</span>
        </Link>

        <nav className="ml-8 hidden items-center gap-6 font-display text-small font-semibold text-text-secondary md:flex">
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

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={SIGNIN}
            className="rounded-sm px-4 py-2 font-display text-small font-semibold text-text transition-colors hover:bg-bg"
          >
            Sign in
          </Link>
          <Link
            href={SIGNUP}
            className="rounded-sm bg-primary px-4 py-2 font-display text-small font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Build My Career Plan
          </Link>
        </div>
      </div>
    </header>
  );
}
