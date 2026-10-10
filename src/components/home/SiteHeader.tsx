import Link from "next/link";
import { SIGNIN, SIGNUP } from "@/components/home/links";
import { Logo } from "@/components/home/Logo";

const NAV = [
  { href: "/#questions", label: "Why ASCENDR" },
  { href: "/#journey", label: "How it works" },
  { href: "/#networks", label: "For networks" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

/** Public site header: sticky, translucent, with a no-JS mobile menu. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/[0.06] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
        <Logo />

        <nav aria-label="Main" className="ml-12 hidden items-center gap-8 text-[15px] text-text-secondary lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link href={SIGNIN} className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-ink transition-colors hover:bg-surface sm:inline-flex">
            Sign in
          </Link>
          <Link href={SIGNUP} className="rounded-full bg-ink px-4 py-2 text-[15px] font-medium text-white transition-colors hover:bg-ink-700">
            Get started
          </Link>
          <details className="group relative lg:hidden">
            <summary
              aria-label="Open menu"
              className="ml-1 flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-[20px] text-ink hover:bg-surface [&::-webkit-details-marker]:hidden"
            >
              <span className="group-open:hidden">≡</span>
              <span className="hidden group-open:inline">×</span>
            </summary>
            <div className="absolute right-0 top-12 w-60 rounded-2xl border border-ink/10 bg-white p-2 shadow-lift">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="block rounded-xl px-4 py-2.5 text-[15px] text-ink hover:bg-surface">
                  {n.label}
                </a>
              ))}
              <Link href={SIGNIN} className="mt-1 block rounded-xl border-t border-ink/[0.06] px-4 py-2.5 text-[15px] font-medium text-ink hover:bg-surface">
                Sign in
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
