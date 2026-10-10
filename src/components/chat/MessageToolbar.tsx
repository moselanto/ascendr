"use client";

import { useState } from "react";
import EmojiPicker from "./EmojiPicker";
import { QUICK_REACTIONS } from "@/lib/chat";

/** Slack-style hover toolbar: quick reactions plus the full picker. */
export default function MessageToolbar({ onReact }: { onReact: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`absolute -top-4 right-3 z-10 flex items-center gap-0.5 rounded-xl border border-border bg-white p-0.5 shadow-card transition-opacity ${
        open ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
      }`}
    >
      {QUICK_REACTIONS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onReact(e)}
          aria-label={`React with ${e}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[16px] hover:bg-surface"
        >
          {e}
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => o === false)}
          aria-label="More reactions"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[15px] text-text-secondary hover:bg-surface hover:text-ink"
        >
          ☺
        </button>
        {open && (
          <EmojiPicker
            align="right"
            placement="bottom"
            onClose={() => setOpen(false)}
            onPick={(e) => {
              onReact(e);
              setOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
