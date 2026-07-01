"use client";

import { useState, useTransition } from "react";
import { togglePostReaction, addComment } from "../feed-actions";

const EMOJIS = ["👍", "🔥", "🎉", "💡"];

type Reaction = { emoji: string; user_id: string };
type Comment = { id: string; body: string; author_name: string };

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

  const initials = (post.author_name || "M").slice(0, 1).toUpperCase();

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
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-small">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
          {initials}
        </div>
        <span className="font-semibold">{post.author_name}</span>
        <span className="text-text-secondary">· {new Date(post.created_at).toLocaleString()}</span>
      </div>

      <p className="mt-2 text-body whitespace-pre-wrap">{post.body}</p>

      {/* Reaction bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {EMOJIS.map((e) => {
          const info = c.get(e);
          return (
            <button
              key={e}
              onClick={() => react(e)}
              className={`rounded-full border px-2.5 py-1 text-caption font-semibold ${
                info?.mine ? "border-primary bg-[#eef2ff] text-primary" : "border-border text-text-secondary"
              }`}
            >
              {e} {info?.count ? info.count : ""}
            </button>
          );
        })}
        <button
          onClick={() => setShowComments((s) => !s)}
          className="ml-auto text-caption font-semibold text-text-secondary hover:text-primary"
        >
          💬 {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 border-t border-border pt-3">
          {comments.length > 0 && (
            <ul className="mb-3 space-y-2">
              {comments.map((cm) => (
                <li key={cm.id} className="text-small">
                  <span className="font-semibold">{cm.author_name}</span>{" "}
                  <span className="text-text">{cm.body}</span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="rounded-sm bg-primary px-4 py-2 text-small font-semibold text-white disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
