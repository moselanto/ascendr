"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FloatingReaction = { id: number; emoji: string; left: number };

// Quick reactions as plain unicode glyphs (broadcast only, never persisted).
const REACTIONS = ["\u2191", "\u2665", "\u2605", "\u2713", "+1"];

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

      {/* Controls — rendered inline in the controls row via a fragment. */}
      <button
        type="button"
        onClick={toggleHand}
        aria-pressed={handRaised}
        className={`rounded-full border px-4 py-2.5 text-[14px] font-medium transition ${
          handRaised
            ? "border-brand-600 bg-brand-50 text-brand-700"
            : "border-ink/15 bg-white text-ink hover:border-ink/40"
        }`}
      >
        {handRaised ? "\u2713 Hand raised" : "Raise hand"}
        {handCount > 0 && (
          <span className="ml-1.5 rounded-full bg-ink px-1.5 text-[12px] font-semibold text-white">
            {handCount}
          </span>
        )}
      </button>

      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40">
          React
        </summary>
        <div className="absolute z-20 mt-2 flex gap-1 rounded-xl border border-border bg-white p-2 shadow-lift">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                react(emoji);
                (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute("open");
              }}
              className="rounded-lg px-2.5 py-1 text-[16px] font-semibold text-ink hover:bg-surface"
            >
              {emoji}
            </button>
          ))}
        </div>
      </details>

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
