"use client";

import { useState } from "react";
import EmojiPicker from "./EmojiPicker";
import { groupReactions, type Reaction } from "@/lib/chat";

/** Reaction pills under a message, plus an "add reaction" button. */
export default function ReactionRow({
  reactions,
  meId,
  onToggle,
}: {
  reactions: Reaction[];
  meId: string;
  onToggle: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const groups = groupReactions(reactions, meId);
  if (groups.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {groups.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={() => onToggle(g.emoji)}
          aria-pressed={g.mine}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] transition-colors ${
            g.mine ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border bg-white text-ink hover:border-ink/30"
          }`}
        >
          <span className="text-[15px] leading-none">{g.emoji}</span>
          <span className="nums text-[12px] font-medium">{g.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => o === false)}
          aria-label="Add reaction"
          className="flex h-6 w-8 items-center justify-center rounded-full border border-border bg-white text-[13px] text-text-secondary hover:border-ink/30 hover:text-ink"
        >
          +
        </button>
        {open && (
          <EmojiPicker
            align="left"
            onClose={() => setOpen(false)}
            onPick={(e) => {
              onToggle(e);
              setOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
