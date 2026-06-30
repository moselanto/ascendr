"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsRead } from "./notifications-actions";

type Notif = {
  id: string;
  type: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell({
  meId,
  initial,
}: {
  meId: string;
  initial: Notif[];
}) {
  const [items, setItems] = useState<Notif[]>(initial);
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const channel = supabase
      .channel(`notif:${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${meId}` },
        (payload) => {
          setItems((prev) => [payload.new as Notif, ...prev].slice(0, 30));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      markNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-md border border-border bg-card shadow-lg z-50">
          <div className="border-b border-border px-4 py-2.5 text-small font-semibold">Notifications</div>
          <div className="max-h-96 overflow-auto">
            {items.length ? (
              items.map((n) => (
                <Link
                  key={n.id}
                  href="/app"
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 text-small border-b border-border last:border-0 ${
                    n.read_at ? "" : "bg-[#eef2ff]"
                  }`}
                >
                  <div>{n.body || n.type}</div>
                  <div className="text-caption text-text-secondary mt-0.5">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-small text-text-secondary">
                You&apos;re all caught up.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
