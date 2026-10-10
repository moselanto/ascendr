"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FloatingReaction = { id: number; emoji: string; left: number };

// Quick reactions as plain unicode glyphs (broadcast only, never persisted).
const REACTIONS = ["↑", "♥", "★", "✓", "+1"];

/**
 * Ephemeral live-room interactions: Raise hand and React.
 *
 * Uses Supabase realtime *broadcast* (no DB writes) so these are instant and
 * cheap. "Raise hand" toggles a presence-style broadcast that other viewers
 * (and the host) see as a live raised-hands count. "React" broadcasts a glyph
 * that floats up on everyone's screen for a moment. Nothing is persisted —
 * these are in-the-moment signals, matching how live rooms behave.
 */
export default function LiveInteractions({
  sessionId,
  meId,
  meName,
}: {
  sessionId: string;
  meId: string;
  meName: string;
}) {
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Record<string, string>>({});
  const [floaters, setFloaters] = useState<FloatingReaction[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const floatSeq = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`live_room:${sessionId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "hand" }, ({ payload }) => {
        setRaisedHands((prev) => {
          const next = { ...prev };
          if (payload.raised) next[payload.userId] = payload.name;
          else delete next[payload.userId];
          return next;
        });
      })
      .on("broadcast", { event: "react" }, ({ payload }) => {
        const id = ++floatSeq.current;
        const left = 10 + Math.random() * 80;
        setFloaters((prev) => [...prev, { id, emoji: payload.emoji, left }]);
        setTimeout(() => {
          setFloaters((prev) => prev.filter((f) => f.id !== id));
        }, 2600);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  function toggleHand() {
    const next = !handRaised;
    setHandRaised(next);
    channelRef.current?.send({
      type: "broadcast",
      event: "hand",
      payload: { userId: meId, name: meName, raised: next },
    });
  }

  function react(emoji: string) {
    channelRef.current?.send({
      type: "broadcast",
      event: "react",
      payload: { emoji },
    });
  }

  const handCount = Object.keys(raisedHands).length;

  return (
    <>
      {/* Floating reactions overlay — fixed near bottom-center of the viewport
          so it's visible regardless of scroll, and never affects layout. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto h-0 max-w-3xl overflow-visible">
        {floaters.map((f) => (
          <span
            key={f.id}
            className="absolute animate-[floatUp_2.6s_ease-out_forwards] text-3xl font-semibold text-brand-600"
            style={{ left: `${f.left}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Controls: rendered inline in the controls bar. */}
      <button
        type="button"
        onClick={toggleHand}
        aria-pressed={handRaised}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium transition ${
          handRaised ? "bg-ink text-white hover:bg-ink-700" : "border border-ink/15 bg-white text-ink hover:border-ink/40"
        }`}
      >
        <span aria-hidden className="text-[15px]">{handRaised ? "✓" : "✋"}</span>
        {handRaised ? "Hand raised" : "Raise hand"}
        {handCount > 0 && (
          <span className={`rounded-full px-1.5 text-[12px] font-semibold ${handRaised ? "bg-white text-ink" : "bg-ink text-white"}`}>{handCount}</span>
        )}
      </button>

      <div role="group" aria-label="Send a reaction" className="flex items-center gap-0.5 rounded-full border border-ink/10 bg-surface p-1">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            aria-label={`React ${emoji}`}
            className="flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[15px] font-semibold text-ink transition hover:bg-white hover:shadow-card active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(.8); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(-200px) scale(1.3); opacity: 0; }
        }
      `}</style>
    </>
  );
}
