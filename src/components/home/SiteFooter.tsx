import Link from "next/link";
import { SIGNIN, SIGNUP } from "@/components/home/links";

export function SiteFooter() {
  return (
    <footer className="bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center">
        <div>
          <Link href="/" className="text-body font-black">
            ASCEND<span className="text-primary">R</span>
          </Link>
          <p className="mt-2 max-w-sm text-caption text-text-secondary">
            Career intelligence — from ambition to measurable outcomes.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-small font-semibold text-text-secondary sm:ml-auto">
          <a href="#questions" className="hover:text-text">
            Why ASCENDR
          </a>
          <a href="#journey" className="hover:text-text">
            How it works
          </a>
          <a href="#faq" className="hover:text-text">
            FAQ
          </a>
          <Link href={SIGNIN} className="hover:text-text">
            Sign in
          </Link>
          <Link href={SIGNUP} className="text-primary hover:opacity-80">
            Get started
          </Link>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-5 text-caption text-text-secondary">
          © {new Date().getFullYear()} ASCENDR. Rise. Learn. Connect. Lead.
        </div>
      </div>
    </footer>
  );
}
