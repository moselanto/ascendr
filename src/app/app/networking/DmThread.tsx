"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendDirectMessage, markDmRead } from "../net-actions";

type Msg = { id: string; sender_id: string; body: string; created_at: string };

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function DmThread({
  meId,
  peerId,
  initialMessages,
  peerName,
}: {
  meId: string;
  peerId: string;
  initialMessages: Msg[];
  peerName?: string | null;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToEnd() {
    // Defer so newly appended messages are in the DOM.
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }

  // Mark incoming as read on open.
  useEffect(() => {
    startTransition(() => markDmRead(peerId));
    scrollToEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  // Realtime: refetch the pair thread on any new DM between me and peer.
  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { data } = await supabase
        .from("direct_messages")
        .select("id, sender_id, body, created_at")
        .or(
          `and(sender_id.eq.${meId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${meId})`
        )
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        setMessages(data);
        scrollToEnd();
        startTransition(() => markDmRead(peerId));
      }
    }

    const channel = supabase
      .channel(`dm-${[meId, peerId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as Msg & { recipient_id: string };
          const involvesPair =
            (m.sender_id === meId && m.recipient_id === peerId) ||
            (m.sender_id === peerId && m.recipient_id === meId);
          if (involvesPair) refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, peerId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    setSendError(null);
    if (!text) return;
    // Optimistic append.
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, sender_id: meId, body: text, created_at: new Date().toISOString() },
    ]);
    setBody("");
    scrollToEnd();
    const fd = new FormData();
    fd.append("recipient_id", peerId);
    fd.append("body", text);
    const tmpId = `tmp-${Date.now()}`;
    startTransition(async () => {
      const res = await sendDirectMessage(fd);
      if (res && res.ok === false) {
        // Roll back the optimistic bubble and give the text back.
        setMessages((prev) => prev.filter((m) => m.id.startsWith("tmp-") === false || m.body !== text));
        setBody(text);
        setSendError("Message not sent. Check your connection and try again.");
      }
    });
    void tmpId;
  }

  const firstName = (peerName || "").split(" ")[0] || "them";

  return (
    <div className="flex min-h-[460px] flex-1 flex-col bg-surface">
      <div ref={scrollRef} className="flex max-h-[60vh] flex-1 flex-col gap-3 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="m-auto max-w-sm rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <p className="text-[15px] font-semibold text-ink">No messages yet</p>
            <p className="mt-1 text-[14px] text-text-secondary">
              Say hello to {firstName}. A short note about what you&apos;re working on goes a long way.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] ${
                    mine
                      ? "rounded-br-md bg-ink text-white"
                      : "rounded-bl-md border border-border bg-white text-ink shadow-card"
                  }`}
                >
                  {m.body}
                </div>
                <span className="mt-1 px-1 text-[11px] text-text-secondary">
                  {m.id.startsWith("tmp-") ? "Sending…" : formatTime(m.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
      {sendError && (
        <p role="alert" className="border-t border-border bg-danger/5 px-4 py-2 text-[12px] text-danger">
          {sendError}
        </p>
      )}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border bg-white p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          aria-label="Message"
          className="flex-1 rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50"
        >
          Send →
        </button>
      </form>
    </div>
  );
}
