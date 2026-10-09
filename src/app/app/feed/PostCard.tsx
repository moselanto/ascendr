"use client";

import { useState, useTransition } from "react";
import { togglePostReaction, addComment } from "../feed-actions";

/**
 * Reaction keys are persisted in post_reactions.emoji, so the stored values
 * stay the same (written as escapes) while the UI shows text labels only.
 */
const REACTIONS: { key: string; label: string }[] = [
  { key: "\uD83D\uDC4D", label: "Like" },
  { key: "\uD83D\uDD25", label: "Fire" },
  { key: "\uD83C\uDF89", label: "Celebrate" },
  { key: "\uD83D\uDCA1", label: "Insight" },
];

type Reaction = { emoji: string; user_id: string };
type Comment = { id: string; body: string; author_name: string };

function initialsOf(name: string) {
  const parts = (name || "Member").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "M";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PostCard({
  post,
  meId,
  reactions,
  comments,
}: {
  post: { id: string; body: string; created_at: string; author_name: string };
  meId: string;
  reactions: Reaction[];
  comments: Comment[];
}) {
  const [rx, setRx] = useState<Reaction[]>(reactions);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [, startTransition] = useTransition();

  const initials = initialsOf(post.author_name);

  function counts() {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of rx) {
      const cur = map.get(r.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.user_id === meId) cur.mine = true;
      map.set(r.emoji, cur);
    }
    return map;
  }

  function react(emoji: string) {
    // Optimistic toggle.
    setRx((prev) => {
      const mine = prev.some((r) => r.emoji === emoji && r.user_id === meId);
      return mine
        ? prev.filter((r) => !(r.emoji === emoji && r.user_id === meId))
        : [...prev, { emoji, user_id: meId }];
    });
    startTransition(() => togglePostReaction(post.id, emoji));
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const fd = new FormData();
    fd.append("post_id", post.id);
    fd.append("body", comment);
    setComment("");
    startTransition(() => addComment(fd));
  }

  const c = counts();

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
      {/* Author row */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-ink">{post.author_name}</div>
          <time
            dateTime={post.created_at}
            title={new Date(post.created_at).toLocaleString()}
            suppressHydrationWarning
            className="text-[12px] text-text-secondary"
          >
            {timeAgo(post.created_at)}
          </time>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{post.body}</p>

      {/* Reaction bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {REACTIONS.map((r) => {
          const info = c.get(r.key);
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => react(r.key)}
              aria-pressed={info?.mine ? true : false}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                info?.mine
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-ink/15 bg-white text-ink hover:border-ink/40"
              }`}
            >
              {r.label}
              {info?.count ? <span className="nums ml-1.5 text-text-secondary">{info.count}</span> : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="ml-auto text-[12px] font-medium text-text-secondary hover:text-ink"
        >
          <span className="nums">{comments.length}</span> {comments.length === 1 ? "comment" : "comments"}{" "}
          {showComments ? "\u25B4" : "\u25BE"}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 rounded-xl bg-surface p-4">
          {comments.length > 0 ? (
            <ul className="mb-4 space-y-3">
              {comments.map((cm) => (
                <li key={cm.id} className="flex gap-2.5">
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
                    {initialsOf(cm.author_name)}
                  </div>
                  <div className="min-w-0 text-[13px]">
                    <span className="font-semibold text-ink">{cm.author_name}</span>{" "}
                    <span className="text-ink">{cm.body}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-[13px] text-text-secondary">No comments yet. Start the conversation.</p>
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment…"
              aria-label="Write a comment"
              className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50"
            >
              Reply
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
