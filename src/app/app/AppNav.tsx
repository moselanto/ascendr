"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
      { href: "/app", label: "Home", icon: "◳" },
      { href: "/app/career", label: "Career intelligence", icon: "↗" },
      { href: "/app/opportunities", label: "Opportunities", icon: "◈" },
      { href: "/app/outcomes", label: "Outcomes ledger", icon: "✓" },
      { href: "/app/ai", label: "AI career coach", icon: "✦" },
    ],
  },
  {
    label: "Network",
    items: [
      { href: "/app/members", label: "Member directory", icon: "⚇" },
      { href: "/app/mentors", label: "Mentors & experts", icon: "★" },
      { href: "/app/networking", label: "Professional network", icon: "⇄" },
      { href: "/app/communities", label: "Communities", icon: "◎" },
      { href: "/app/network", label: "Network intelligence", icon: "▣" },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/app/learn", label: "Learning paths", icon: "▦" },
      { href: "/app/live", label: "Live sessions", icon: "◉" },
      { href: "/app/feed", label: "Community feed", icon: "▤" },
      { href: "/app/communities/new", label: "Create", icon: "＋" },
    ],
  },
];

export const ADMIN_GROUP: NavGroup = {
  label: "Admin",
  items: [{ href: "/app/admin/metrics", label: "Platform metrics", icon: "▤" }],
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
  messagesUnread = false,
  streak,
}: {
  isAdmin: boolean;
  communitiesUnread: boolean;
  messagesUnread?: boolean;
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
                const showDot = (n.href === "/app/communities" && communitiesUnread) || (n.href === "/app/networking" && messagesUnread);
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
        <div className="relative overflow-hidden rounded-2xl bg-ink p-4 text-white">
          <div aria-hidden className="bg-dots-light absolute inset-0 opacity-40" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              ASCENDR Pro
            </span>
            <p className="mt-2.5 text-[15px] font-semibold leading-snug tracking-tight">
              Go further, <span className="accent-serif text-brand-200">faster.</span>
            </p>
            <ul className="mt-2 space-y-1 text-[12px] text-white/70">
              <li>{"✓"} 8x more AI coaching</li>
              <li>{"✓"} 10x interview practice</li>
              <li>{"✓"} Run your own talent network</li>
            </ul>
            <p className="mt-2.5 text-[12px] text-white/60">
              From <span className="font-semibold text-white">KES 13,000</span>/month
            </p>
            <Link
              href="/app/plans"
              className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-brand-50"
            >
              See plans <span aria-hidden>{"→"}</span>
            </Link>
          </div>
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

const PRIMARY_MOBILE = ["/app", "/app/career", "/app/opportunities", "/app/mentors"];

/**
 * Mobile navigation: four primary tabs plus "More", which opens a sheet with
 * every destination grouped as in the sidebar. Replaces the scrolling strip
 * of 14 icons, which was hard to scan on a phone.
 */
export function MobileNav({
  communitiesUnread,
  messagesUnread = false,
}: {
  communitiesUnread: boolean;
  messagesUnread?: boolean;
}) {
  const pathname = usePathname() ?? "/app";
  const [open, setOpen] = useState(false);
  const all = NAV_GROUPS.flatMap((g) => g.items);
  const primary = PRIMARY_MOBILE.map((h) => all.find((i) => i.href === h)).filter(Boolean) as NavItem[];
  const moreActive = primary.some((p) => isActive(pathname, p.href)) === false;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-24 pt-5 shadow-lift">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="mb-4">
                <p className="pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary/70">{g.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((n) => {
                    const active = isActive(pathname, n.href);
                    const showDot = (n.href === "/app/communities" && communitiesUnread) || (n.href === "/app/networking" && messagesUnread);
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className={`relative flex items-center gap-2.5 rounded-xl px-3 py-3 text-[13px] font-medium ${
                          active ? "bg-ink text-white" : "bg-surface text-ink"
                        }`}
                      >
                        <span className="w-4 text-center">{n.icon}</span>
                        <span className="truncate">{n.label}</span>
                        {showDot && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Primary">
        {primary.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-label={n.label}
              className={`flex flex-col items-center gap-0.5 py-2 ${active ? "text-ink" : "text-text-secondary"}`}
            >
              <span className={`flex h-7 w-10 items-center justify-center rounded-full text-[15px] ${active ? "bg-ink text-white" : ""}`}>{n.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{n.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setOpen((o) => o === false)}
          aria-expanded={open}
          className={`relative flex flex-col items-center gap-0.5 py-2 ${moreActive || open ? "text-ink" : "text-text-secondary"}`}
        >
          <span className={`flex h-7 w-10 items-center justify-center rounded-full text-[15px] ${moreActive || open ? "bg-ink text-white" : ""}`}>{"≡"}</span>
          <span className="text-[10px] font-medium leading-tight">More</span>
          {(communitiesUnread || messagesUnread) && <span className="absolute right-4 top-1.5 h-2 w-2 rounded-full bg-danger" />}
        </button>
      </nav>
    </>
  );
}
