"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { postChannelMessage, toggleReaction, markChannelRead } from "../actions";
import type { ChannelMessage } from "@/lib/types";
import { toggleLocal, type Reaction } from "@/lib/chat";
import { Avatar } from "@/components/ui/Avatar";
import Composer from "@/components/chat/Composer";
import MessageToolbar from "@/components/chat/MessageToolbar";
import ReactionRow from "@/components/chat/ReactionRow";
import { MessageAttachments, MessageText } from "@/components/chat/MessageBody";

type Msg = ChannelMessage & { reactions?: Reaction[] };

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

/** Real-time channel chat with Slack-style reactions, media and presence. */
export default function ChannelChat({
  channelId,
  communityId,
  slug,
  channelName,
  meId,
  meName,
  initialMessages,
}: {
  channelId: string;
  communityId: string;
  slug: string;
  channelName: string;
  meId: string;
  meName: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [onlineCount, setOnlineCount] = useState(1);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesRef = useRef<Msg[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<Awaited<ReturnType<typeof createClient>>["channel"]> | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    markChannelRead(channelId);
  }, [channelId, messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`room:${channelId}`, { config: { presence: { key: meId } } });
    channelRef.current = channel;

    async function refreshReactions() {
      const ids = messagesRef.current.map((m) => m.id);
      if (ids.length === 0) return;
      const { data } = await supabase.from("message_reactions").select("message_id, emoji, user_id").in("message_id", ids);
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          reactions: (data ?? []).filter((r) => r.message_id === m.id).map((r) => ({ emoji: r.emoji, user_id: r.user_id })),
        }))
      );
    }

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const row = payload.new as ChannelMessage;
          const { data: prof } = await supabase.from("profiles").select("full_name, handle, avatar_url").eq("id", row.author_id).maybeSingle();
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, { ...row, profiles: prof ?? null, reactions: [] }]));
          setTypingUsers((prev) => prev.filter((n) => n !== (prof?.full_name || "")));
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => refreshReactions())
      .on("presence", { event: "sync" }, () => setOnlineCount(Object.keys(channel.presenceState()).length || 1))
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const name = payload?.name as string;
        const id = payload?.id as string;
        if (name == null || id === meId) return;
        setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
        setTimeout(() => setTypingUsers((prev) => prev.filter((n) => n !== name)), 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ id: meId, name: meName, at: Date.now() });
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelId, meId, meName]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function react(messageId: string, emoji: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: toggleLocal(m.reactions ?? [], emoji, meId) } : m)));
    toggleReaction(messageId, emoji, communityId, slug);
  }

  function sendTyping() {
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { id: meId, name: meName } });
  }

  async function send(body: string, attachments: Parameters<typeof postChannelMessage>[0]["attachments"]) {
    const res = await postChannelMessage({ channelId, communityId, slug, body, attachments });
    return res.ok;
  }

  const typingLabel =
    typingUsers.length === 1 ? `${typingUsers[0]} is typing…` : typingUsers.length > 1 ? `${typingUsers.length} people are typing…` : "";

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border bg-surface px-5 py-2 text-[12px] text-text-secondary">
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
        {onlineCount} online in #{channelName}
      </div>

      <div ref={scrollRef} className="flex max-h-[560px] min-h-[320px] flex-col overflow-y-auto py-3">
        {messages.length ? (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = prev == null || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
            const grouped =
              newDay === false &&
              prev.author_id === m.author_id &&
              new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW_MS;
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="my-3 flex items-center gap-3 px-5">
                    <span className="h-px flex-1 bg-border" />
                    <span className="rounded-full border border-border bg-white px-3 py-0.5 text-[11px] font-medium text-text-secondary">{dayLabel(m.created_at)}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className={`group relative flex gap-3 px-5 hover:bg-surface/70 ${grouped ? "py-0.5" : "pt-2.5 pb-0.5"}`}>
                  <MessageToolbar onReact={(e) => react(m.id, e)} />
                  <div className="w-9 shrink-0">
                    {grouped ? (
                      <span className="block pt-1 text-right text-[10px] text-text-secondary opacity-0 group-hover:opacity-100">{timeLabel(m.created_at)}</span>
                    ) : (
                      <Avatar name={m.profiles?.full_name} url={m.profiles?.avatar_url} size={36} shape="rounded-lg" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {grouped === false && (
                      <p className="text-[14px] leading-tight">
                        <span className="font-semibold text-ink">{m.profiles?.full_name || "Member"}</span>
                        <span className="ml-2 text-[11px] text-text-secondary">{timeLabel(m.created_at)}</span>
                      </p>
                    )}
                    <MessageText body={m.body} />
                    <MessageAttachments items={m.attachments} />
                    <ReactionRow reactions={m.reactions ?? []} meId={meId} onToggle={(e) => react(m.id, e)} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="m-auto max-w-sm px-5 py-10 text-center">
            <p className="text-[15px] font-semibold text-ink">This is the start of #{channelName}</p>
            <p className="mt-1 text-[14px] text-text-secondary">Say hello, share a photo or a video, or react to get the conversation going.</p>
          </div>
        )}
      </div>

      <div className="h-5 px-5 text-[12px] italic text-text-secondary">{typingLabel}</div>
      <Composer placeholder={`Message #${channelName}`} onSend={send} onTyping={sendTyping} />
    </>
  );
}
