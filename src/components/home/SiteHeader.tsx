import Link from "next/link";
import { SIGNIN, SIGNUP } from "@/components/home/links";
import { Logo } from "@/components/home/Logo";

const NAV = [
  { href: "#questions", label: "Why ASCENDR" },
  { href: "#journey", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/[0.06] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
        <Logo />

        <nav className="ml-12 hidden items-center gap-8 text-[15px] text-text-secondary lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href={SIGNIN}
            className="rounded-full px-4 py-2 text-[15px] font-medium text-ink transition-colors hover:bg-surface"
          >
            Sign in
          </Link>
          <Link
            href={SIGNUP}
            className="rounded-full bg-ink px-4 py-2 text-[15px] font-medium text-white transition-colors hover:bg-ink-700"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
