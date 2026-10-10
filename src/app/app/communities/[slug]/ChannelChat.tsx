"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, toggleReaction, markChannelRead } from "../actions";
import type { ChannelMessage } from "@/lib/types";

type MsgWithReactions = ChannelMessage & {
  reactions?: { emoji: string; user_id: string }[];
};

// Quick reactions as plain unicode glyphs (stored as the reaction value).
const EMOJIS = ["↑", "★", "✓", "♥"];

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
      <div className="flex items-center gap-2 border-b border-border bg-surface px-5 py-2 text-[12px] text-text-secondary">
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
        {onlineCount} online in #{channelName}
      </div>

      <div className="flex max-h-[480px] flex-col gap-5 overflow-auto px-5 py-5">
        {messages.length ? (
          messages.map((m) => {
            const counts = (m.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
              return acc;
            }, {});
            const mine = new Set((m.reactions ?? []).filter((r) => r.user_id === meId).map((r) => r.emoji));
            return (
              <div key={m.id} className="group flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
                  {(m.profiles?.full_name || "M").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px]">
                    <span className="font-semibold text-ink">{m.profiles?.full_name || "Member"}</span>
                    <span className="text-[12px] text-text-secondary"> · {new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] text-ink">{m.body}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {Object.entries(counts).map(([emoji, n]) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(m.id, emoji, communityId, slug)}
                        className={`rounded-full border px-2 py-0.5 text-[12px] ${
                          mine.has(emoji)
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-border text-text-secondary hover:border-ink/40"
                        }`}
                      >
                        {emoji} {n}
                      </button>
                    ))}
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      {EMOJIS.filter((e) => !(e in counts)).map((e) => (
                        <button
                          key={e}
                          onClick={() => toggleReaction(m.id, e, communityId, slug)}
                          className="rounded-full border border-transparent px-2 py-0.5 text-[12px] text-text-secondary hover:border-border hover:bg-surface"
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
          <div className="py-8 text-center">
            <div className="text-[15px] font-semibold text-ink">No messages yet</div>
            <p className="mt-1 text-[14px] text-text-secondary">Start the conversation in #{channelName}.</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="h-5 px-5 text-[12px] italic text-text-secondary">{typingLabel}</div>

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
          className="flex-1 rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink"
        />
        <button className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
          Send
        </button>
      </form>
    </>
  );
}
