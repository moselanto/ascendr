"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendDirectMessage, markDmRead, toggleDmReaction } from "../net-actions";
import { toggleLocal, type Attachment, type Reaction } from "@/lib/chat";
import Composer from "@/components/chat/Composer";
import MessageToolbar from "@/components/chat/MessageToolbar";
import ReactionRow from "@/components/chat/ReactionRow";
import { MessageAttachments, MessageText } from "@/components/chat/MessageBody";

export type DmMessage = {
  id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  attachments?: Attachment[] | null;
  reactions?: Reaction[];
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** One-to-one conversation with reactions, emoji, media and live updates. */
export default function DmThread({
  meId,
  peerId,
  initialMessages,
  peerName,
}: {
  meId: string;
  peerId: string;
  initialMessages: DmMessage[];
  peerName?: string | null;
}) {
  const [messages, setMessages] = useState<DmMessage[]>(initialMessages);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<DmMessage[]>(initialMessages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }

  useEffect(() => {
    startTransition(() => markDmRead(peerId));
    scrollToEnd();
  }, [peerId]);

  useEffect(() => {
    const supabase = createClient();
    const pair = `and(sender_id.eq.${meId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${meId})`;

    async function refresh() {
      const { data } = await supabase.from("direct_messages").select("*").or(pair).order("created_at", { ascending: true }).limit(200);
      if (data == null) return;
      const ids = data.map((m: { id: string }) => m.id);
      const { data: rx } = ids.length
        ? await supabase.from("dm_reactions").select("message_id, emoji, user_id").in("message_id", ids)
        : { data: [] as { message_id: string; emoji: string; user_id: string }[] };
      setMessages(
        (data as DmMessage[]).map((m) => ({
          ...m,
          reactions: (rx ?? []).filter((r) => r.message_id === m.id).map((r) => ({ emoji: r.emoji, user_id: r.user_id })),
        }))
      );
      scrollToEnd();
      startTransition(() => markDmRead(peerId));
    }

    const channel = supabase
      .channel(`dm-${[meId, peerId].sort().join("-")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as { sender_id: string; recipient_id: string };
        const involvesPair = (m.sender_id === meId && m.recipient_id === peerId) || (m.sender_id === peerId && m.recipient_id === meId);
        if (involvesPair) refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_reactions" }, (payload) => {
        const row = (payload.new ?? payload.old) as { message_id?: string };
        if (row?.message_id && messagesRef.current.some((m) => m.id === row.message_id)) refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, peerId]);

  function react(messageId: string, emoji: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: toggleLocal(m.reactions ?? [], emoji, meId) } : m)));
    toggleDmReaction(messageId, emoji);
  }

  async function send(body: string, attachments: Attachment[]) {
    const tmp: DmMessage = { id: `tmp-${Date.now()}`, sender_id: meId, body, attachments, created_at: new Date().toISOString(), reactions: [] };
    setMessages((prev) => [...prev, tmp]);
    scrollToEnd();
    const fd = new FormData();
    fd.append("recipient_id", peerId);
    fd.append("body", body);
    fd.append("attachments", JSON.stringify(attachments));
    const res = await sendDirectMessage(fd);
    if (res == null || res.ok === false) {
      setMessages((prev) => prev.filter((m) => m.id !== tmp.id));
      return false;
    }
    return true;
  }

  const firstName = (peerName || "").split(" ")[0] || "them";

  return (
    <div className="flex min-h-[460px] flex-1 flex-col bg-white">
      <div ref={scrollRef} className="flex max-h-[60vh] flex-1 flex-col overflow-y-auto py-3">
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
            const pending = m.id.startsWith("tmp-");
            return (
              <div key={m.id} className={`group relative flex px-4 py-1 ${mine ? "justify-end" : "justify-start"}`}>
                {pending === false && <MessageToolbar onReact={(e) => react(m.id, e)} />}
                <div className={`flex max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  {(m.body ?? "").trim().length > 0 && (
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        mine ? "rounded-br-md bg-ink text-white [&_a]:text-brand-200 [&_p]:text-white" : "rounded-bl-md border border-border bg-surface text-ink"
                      }`}
                    >
                      <MessageText body={m.body} />
                    </div>
                  )}
                  <MessageAttachments items={m.attachments} />
                  <ReactionRow reactions={m.reactions ?? []} meId={meId} onToggle={(e) => react(m.id, e)} />
                  <span className="mt-1 px-1 text-[11px] text-text-secondary">{pending ? "Sending…" : timeLabel(m.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Composer placeholder={`Message ${firstName}`} onSend={send} />
    </div>
  );
}
