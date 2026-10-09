import Link from "next/link";
import { SIGNIN, SIGNUP } from "@/components/home/links";
import { Logo } from "@/components/home/Logo";

export function SiteFooter() {
  return (
    <footer className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 border-t border-ink/[0.06] px-6 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            Career intelligence, from ambition to measurable outcomes.
          </p>
        </div>

        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-text-secondary">Product</p>
          <ul className="mt-4 space-y-2.5 text-[15px] text-ink">
            <li><a href="#questions" className="hover:text-brand-600">Why ASCENDR</a></li>
            <li><a href="#journey" className="hover:text-brand-600">How it works</a></li>
            <li><a href="#faq" className="hover:text-brand-600">FAQ</a></li>
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-text-secondary">Account</p>
          <ul className="mt-4 space-y-2.5 text-[15px] text-ink">
            <li><Link href={SIGNIN} className="hover:text-brand-600">Sign in</Link></li>
            <li><Link href={SIGNUP} className="hover:text-brand-600">Create an account</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-6 py-6 text-[13px] text-text-secondary sm:flex-row">
          <span>© {new Date().getFullYear()} ASCENDR</span>
          <span>Rise. Learn. Connect. Lead.</span>
        </div>
      </div>
    </footer>
  );
}
