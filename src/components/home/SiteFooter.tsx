import Link from "next/link";
import { PILOT_CONTACT, SIGNIN, SIGNUP } from "@/components/home/links";
import { Logo } from "@/components/home/Logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/#questions", label: "Why ASCENDR" },
      { href: "/#journey", label: "How it works" },
      { href: "/#explore", label: "Explore a role" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "For networks",
    links: [
      { href: "/#networks", label: "Readiness map" },
      { href: "/networks", label: "Interactive demo" },
      { href: PILOT_CONTACT, label: "Run a pilot" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: SIGNIN, label: "Sign in" },
      { href: SIGNUP, label: "Create an account" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 border-t border-ink/[0.06] px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            Career intelligence for people and the networks that develop them.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-text-secondary">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-brand-600">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-6 py-6 text-[13px] text-text-secondary sm:flex-row">
          <span>
            © {new Date().getFullYear()} ASCENDR. All rights reserved. A product of{" "}
            <a
              href="https://pimofydigital.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink underline-offset-4 hover:text-brand-600 hover:underline"
            >
              Pimofy Digital LLP
            </a>
            .
          </span>
          <span>Rise. Learn. Connect. Lead.</span>
        </div>
      </div>
    </footer>
  );
}
