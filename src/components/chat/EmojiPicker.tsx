"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EMOJI_CATEGORIES } from "./emoji-data";

const RECENT_KEY = "ascendr:recent-emoji";

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((e): e is string => typeof e === "string").slice(0, 16) : [];
  } catch {
    return [];
  }
}

function saveRecent(emoji: string) {
  try {
    const next = [emoji, ...readRecent().filter((e) => e !== emoji)].slice(0, 16);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: recents are a nicety */
  }
}

/**
 * Searchable emoji picker popover. Render it inside a `relative` wrapper; it
 * closes on outside click or Escape.
 */
export default function EmojiPicker({
  onPick,
  onClose,
  align = "right",
  placement = "top",
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
  align?: "left" | "right";
  placement?: "top" | "bottom";
}) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setRecent(readRecent()), []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && boxRef.current.contains(e.target as Node) === false) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return null;
    return EMOJI_CATEGORIES.flatMap((c) => c.items).filter(([, kw]) => kw.includes(q));
  }, [query]);

  function pick(emoji: string) {
    saveRecent(emoji);
    onPick(emoji);
  }

  const cell = "flex h-8 w-8 items-center justify-center rounded-md text-[20px] leading-none hover:bg-surface";

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label="Choose an emoji"
      className={`absolute z-50 w-[300px] rounded-2xl border border-border bg-white p-3 shadow-lift ${
        align === "right" ? "right-0" : "left-0"
      } ${placement === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search emoji"
        aria-label="Search emoji"
        className="w-full rounded-lg border border-border px-3 py-2 text-[13px] text-ink outline-none focus:border-ink/30"
      />
      <div className="mt-2 max-h-64 overflow-y-auto pr-1">
        {results ? (
          results.length ? (
            <div className="grid grid-cols-8 gap-0.5">
              {results.map(([e, kw]) => (
                <button key={e + kw} type="button" title={kw} onClick={() => pick(e)} className={cell}>
                  {e}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-text-secondary">No emoji found</p>
          )
        ) : (
          <>
            {recent.length > 0 && (
              <section>
                <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Recent</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {recent.map((e) => (
                    <button key={`r-${e}`} type="button" onClick={() => pick(e)} className={cell}>
                      {e}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {EMOJI_CATEGORIES.map((c) => (
              <section key={c.name} className="mt-2">
                <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{c.name}</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {c.items.map(([e, kw]) => (
                    <button key={e + kw} type="button" title={kw} onClick={() => pick(e)} className={cell}>
                      {e}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
