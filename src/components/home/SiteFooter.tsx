import Link from "next/link";
import { SIGNIN, SIGNUP } from "@/components/home/links";

export function SiteFooter() {
  return (
    <footer className="bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 sm:flex-row sm:items-start">
        <div className="max-w-sm">
          <Link href="/" className="text-[20px] font-extrabold tracking-tight text-text">
            ASCEND<span className="text-primary">R</span>
          </Link>
          <p className="mt-3 text-small text-text-secondary">
            Career intelligence — from ambition to measurable outcomes.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-7 gap-y-3 text-small font-medium text-text-secondary sm:ml-auto sm:justify-end">
          <a href="#questions" className="transition-colors hover:text-text">
            Why ASCENDR
          </a>
          <a href="#journey" className="transition-colors hover:text-text">
            How it works
          </a>
          <a href="#faq" className="transition-colors hover:text-text">
            FAQ
          </a>
          <Link href={SIGNIN} className="transition-colors hover:text-text">
            Sign in
          </Link>
          <Link href={SIGNUP} className="font-semibold text-primary hover:opacity-80">
            Get started
          </Link>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-caption text-text-secondary">
          © {new Date().getFullYear()} ASCENDR. Rise. Learn. Connect. Lead.
        </div>
      </div>
    </footer>
  );
}
