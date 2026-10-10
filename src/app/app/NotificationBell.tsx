"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsRead } from "./notifications-actions";
import { timeAgo } from "@/lib/notifications";

type Notif = {
  id: string;
  type: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell({ meId, initial }: { meId: string; initial: Notif[] }) {
  const [items, setItems] = useState<Notif[]>(initial);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => n.read_at == null).length;

  useEffect(() => setItems(initial), [initial]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notif:${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${meId}` },
        (payload) => setItems((prev) => [payload.new as Notif, ...prev.filter((p) => p.id !== (payload.new as Notif).id)].slice(0, 30))
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${meId}` },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: n.read_at } : p)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (open === false) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && boxRef.current.contains(e.target as Node) === false) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function markAll() {
    markNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => o === false)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-ink hover:border-ink/30"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[14px] font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-[12px] font-medium text-brand-600 hover:text-brand-700">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length ? (
              items.map((n) => (
                <a
                  key={n.id}
                  href={`/app/notifications/${n.id}`}
                  className={`flex gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-surface ${n.read_at ? "" : "bg-brand-50/60"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-brand-600"}`} />
                  <span className="min-w-0">
                    <span className={`block text-[13px] ${n.read_at ? "text-ink/80" : "font-medium text-ink"}`}>{n.body || n.type}</span>
                    <span className="mt-0.5 block text-[11px] text-text-secondary">{timeAgo(n.created_at)}</span>
                  </span>
                </a>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-[13px] text-text-secondary">You&apos;re all caught up.</div>
            )}
          </div>
          <Link
            href="/app/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-2.5 text-center text-[13px] font-medium text-ink hover:bg-surface"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
