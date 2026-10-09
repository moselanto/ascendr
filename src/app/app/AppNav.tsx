"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * App sidebar - prototype layout (grouped navigation, quiet active state,
 * momentum + Pro cards at the bottom) in the site's ink / Instrument Sans
 * system. Client component only for the active-route highlight.
 */

export type NavItem = { href: string; label: string; icon: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/app", label: "Home", icon: "\u25F3" },
      { href: "/app/career", label: "Career intelligence", icon: "\u2197" },
      { href: "/app/opportunities", label: "Opportunities", icon: "\u25C8" },
      { href: "/app/ai", label: "AI career coach", icon: "\u2726" },
    ],
  },
  {
    label: "Network",
    items: [
      { href: "/app/members", label: "Member directory", icon: "\u2687" },
      { href: "/app/mentors", label: "Mentors & experts", icon: "\u2605" },
      { href: "/app/networking", label: "Professional network", icon: "\u21C4" },
      { href: "/app/communities", label: "Communities", icon: "\u25CE" },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/app/learn", label: "Learning paths", icon: "\u25A6" },
      { href: "/app/live", label: "Live sessions", icon: "\u25C9" },
      { href: "/app/feed", label: "Community feed", icon: "\u25A4" },
      { href: "/app/communities/new", label: "Create", icon: "\uFF0B" },
    ],
  },
];

export const ADMIN_GROUP: NavGroup = {
  label: "Admin",
  items: [{ href: "/app/admin/metrics", label: "Network intelligence", icon: "\u25A3" }],
};

export function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/communities") return pathname.startsWith("/app/communities") && pathname.startsWith("/app/communities/new") === false;
  return pathname === href || pathname.startsWith(href + "/");
}

export function titleFor(pathname: string, groups: NavGroup[]) {
  let best: NavItem | null = null;
  groups.forEach((g) =>
    g.items.forEach((i) => {
      if (isActive(pathname, i.href) && (best === null || i.href.length > best.href.length)) best = i;
    })
  );
  if (best) return (best as NavItem).label;
  if (pathname.startsWith("/app/settings")) return "My profile";
  return "Home";
}

export function AppSidebar({
  isAdmin,
  communitiesUnread,
  streak,
}: {
  isAdmin: boolean;
  communitiesUnread: boolean;
  streak: number;
}) {
  const pathname = usePathname() ?? "/app";
  const groups = isAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col overflow-y-auto border-r border-border bg-white px-3 pb-5 pt-6 md:flex">
      <Link href="/app" className="flex items-center gap-2.5 px-3 pb-7 text-ink">
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden>
          <rect width="26" height="26" rx="7" className="fill-ink" />
          <rect x="6" y="14" width="3.2" height="6" rx="1.2" className="fill-brand-300" />
          <rect x="11.4" y="10" width="3.2" height="10" rx="1.2" className="fill-brand-400" />
          <rect x="16.8" y="6" width="3.2" height="14" rx="1.2" className="fill-brand-500" />
        </svg>
        <span className="text-[17px] font-semibold tracking-[0.08em]">ASCENDR</span>
      </Link>

      <nav className="flex flex-col gap-6" aria-label="Primary">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary/70">{g.label}</p>
            <div className="flex flex-col gap-0.5">
              {g.items.map((n) => {
                const active = isActive(pathname, n.href);
                const showDot = n.href === "/app/communities" && communitiesUnread;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                      active ? "bg-ink text-white" : "text-text-secondary hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <span className="w-4 text-center text-[15px] leading-none">{n.icon}</span>
                    <span className="truncate">{n.label}</span>
                    {showDot && <span className="ml-auto h-2 w-2 rounded-full bg-danger" aria-label="Unread activity" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-3 px-1 pt-8">
        <div className="rounded-xl bg-emerald-50 px-3.5 py-3 text-[12px] font-semibold text-emerald-800">
          {streak > 0 ? `${streak}-day streak. You are building momentum.` : "Take one career action today to start a streak."}
        </div>
        <div className="rounded-xl border border-border p-3.5">
          <p className="text-[13px] font-semibold text-ink">Go further with Pro</p>
          <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">Deeper career intelligence and interview practice.</p>
          <Link href="/app/settings" className="mt-3 inline-flex rounded-full border border-ink/15 px-3 py-1.5 text-[12px] font-medium text-ink hover:border-ink/40">
            Explore Pro
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function AppCrumb({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "/app";
  const groups = isAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS;
  return (
    <p className="hidden truncate text-[13px] text-text-secondary sm:block">
      Workspace <span className="mx-1.5 text-border">/</span>
      <span className="font-semibold text-ink">{titleFor(pathname, groups)}</span>
    </p>
  );
}

export function MobileNav({ communitiesUnread }: { communitiesUnread: boolean }) {
  const pathname = usePathname() ?? "/app";
  const items = NAV_GROUPS.flatMap((g) => g.items);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-border bg-white/95 px-2 py-1.5 backdrop-blur md:hidden"
      aria-label="Primary"
    >
      {items.map((n) => {
        const active = isActive(pathname, n.href);
        const showDot = n.href === "/app/communities" && communitiesUnread;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-label={n.label}
            className={`relative flex min-w-[64px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 ${active ? "bg-ink text-white" : "text-text-secondary"}`}
          >
            <span className="text-[16px] leading-none">{n.icon}</span>
            <span className="text-[10px] font-medium leading-tight">{n.label.split(" ")[0]}</span>
            {showDot && <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-danger" />}
          </Link>
        );
      })}
    </nav>
  );
}
