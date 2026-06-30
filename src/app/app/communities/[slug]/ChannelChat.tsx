"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, toggleReaction, markChannelRead } from "../actions";
import type { ChannelMessage } from "@/lib/types";

type MsgWithReactions = ChannelMessage & {
  reactions?: { emoji: string; user_id: string }[];
};

const EMOJIS = ["👍", "🎉", "🔥", "❤️"];

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
  initialMessages: MsgWithReactions[];
}) {
  const [messages, setMessages] = useState<MsgWithReactions[]>(initialMessages);
  const [onlineCount, setOnlineCount] = useState(1);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    markChannelRead(channelId);
  }, [channelId, messages.length]);

  useEffect(() => {
    const channel = supabase.channel(`room:${channelId}`, {
      config: { presence: { key: meId } },
    });
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const row = payload.new as ChannelMessage;
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, handle, avatar_url")
            .eq("id", row.author_id)
            .maybeSingle();
          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [...prev, { ...row, profiles: prof ?? null, reactions: [] }]
          );
          setTypingUsers((prev) => prev.filter((n) => n !== (prof?.full_name || "")));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => refreshReactions()
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length || 1);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const name = payload?.name as string;
        const id = payload?.id as string;
        if (!name || id === meId) return;
        setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
        setTimeout(() => setTypingUsers((prev) => prev.filter((n) => n !== name)), 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ id: meId, name: meName, at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  async function refreshReactions() {
    const ids = messages.map((m) => m.id);
    if (!ids.length) return;
    const { data } = await supabase
      .from("message_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", ids);
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        reactions: (data ?? [])
          .filter((r) => r.message_id === m.id)
          .map((r) => ({ emoji: r.emoji, user_id: r.user_id })),
      }))
    );
  }

  function handleTyping() {
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { id: meId, name: meName },
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const typingLabel =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing…`
      : typingUsers.length > 1
      ? `${typingUsers.length} people are typing…`
      : "";

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-5 py-2 text-caption text-text-secondary">
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
        {onlineCount} online in #{channelName}
      </div>

      <div className="flex flex-col gap-4 p-5 max-h-[440px] overflow-auto">
        {messages.length ? (
          messages.map((m) => {
            const counts = (m.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
              return acc;
            }, {});
            const mine = new Set((m.reactions ?? []).filter((r) => r.user_id === meId).map((r) => r.emoji));
            return (
              <div key={m.id} className="group flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
                  {(m.profiles?.full_name || "M").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-small">
                    <span className="font-semibold">{m.profiles?.full_name || "Member"}</span>
                    <span className="text-text-secondary"> · {new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-body whitespace-pre-wrap break-words">{m.body}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {Object.entries(counts).map(([emoji, n]) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(m.id, emoji, communityId, slug)}
                        className={`rounded-full border px-2 py-0.5 text-caption ${
                          mine.has(emoji) ? "border-primary bg-[#eef2ff] text-primary" : "border-border text-text-secondary"
                        }`}
                      >
                        {emoji} {n}
                      </button>
                    ))}
                    <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                      {EMOJIS.filter((e) => !(e in counts)).map((e) => (
                        <button
                          key={e}
                          onClick={() => toggleReaction(m.id, e, communityId, slug)}
                          className="rounded-full px-1.5 py-0.5 text-caption hover:bg-bg"
                          aria-label={`React ${e}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-text-secondary py-6">No messages yet — say hello 👋</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="h-5 px-5 text-caption text-text-secondary italic">{typingLabel}</div>

      <form action={sendMessage} className="flex gap-2 border-t border-border p-4">
        <input type="hidden" name="channel_id" value={channelId} />
        <input type="hidden" name="community_id" value={communityId} />
        <input type="hidden" name="slug" value={slug} />
        <input
          name="body"
          required
          autoComplete="off"
          onChange={handleTyping}
          placeholder={`Message #${channelName}…`}
          className="flex-1 rounded-sm border border-border px-4 py-2.5 text-body"
        />
        <button className="rounded-sm bg-primary px-5 py-2.5 text-small font-semibold text-white">Send</button>
      </form>
    </>
  );
}
