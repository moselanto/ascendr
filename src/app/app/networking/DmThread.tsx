"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendDirectMessage, markDmRead } from "../net-actions";

type Msg = { id: string; sender_id: string; body: string; created_at: string };

export default function DmThread({
  meId,
  peerId,
  initialMessages,
}: {
  meId: string;
  peerId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  function scrollToEnd() {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
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
    startTransition(() => sendDirectMessage(fd));
  }

  return (
    <div className="mt-4 flex flex-col rounded-md border border-border bg-card" style={{ minHeight: 420 }}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 460 }}>
        {messages.length === 0 ? (
          <p className="text-small text-text-secondary">No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.sender_id === meId ? "text-right" : "text-left"}>
              <div
                className={`inline-block max-w-[80%] rounded-2xl px-3 py-2 text-small ${
                  m.sender_id === meId
                    ? "bg-primary text-white"
                    : "border border-border bg-bg text-text"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-sm bg-primary px-4 py-2 text-small font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
