"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/admin", label: "Overview" },
  { href: "/app/admin/metrics", label: "Metrics" },
  { href: "/app/admin/funders", label: "Funder metrics" },
  { href: "/app/admin/members", label: "Members" },
  { href: "/app/admin/networks", label: "Networks" },
  { href: "/app/admin/fees", label: "Hire fees" },
  { href: "/app/admin/sponsors", label: "Sponsors" },
  { href: "/app/admin/content", label: "Content" },
];

/** Pill sub-navigation for the platform admin console. Holds no data. */
export default function AdminTabs() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Admin sections" className="flex flex-wrap items-center gap-1">
      {TABS.map((t) => {
        const active =
          t.href === "/app/admin" ? pathname === "/app/admin" : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-white"
                : "rounded-full px-4 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-ink"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
