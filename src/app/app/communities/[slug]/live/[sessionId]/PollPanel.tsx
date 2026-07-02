"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createLivePoll, voteLivePoll, closeLivePoll } from "../../../poll-actions";

export type LivePoll = {
  id: string;
  session_id: string;
  question: string;
  options: string[];
  status: "open" | "closed";
  created_at: string;
};

type VoteRow = { poll_id: string; user_id: string; option_index: number };

/**
 * Realtime poll panel for a live session. Members vote and see live tallies;
 * hosts/mods create and close polls. Subscribes to live_polls (INSERT/UPDATE)
 * and live_poll_votes (INSERT/UPDATE/DELETE) so results update instantly for
 * everyone. Votes are cast through server actions; a member has one vote per
 * poll (changeable while the poll is open).
 */
export default function PollPanel({
  sessionId,
  slug,
  meId,
  canModerate,
  initialPolls,
  initialVotes,
}: {
  sessionId: string;
  slug: string;
  meId: string;
  canModerate: boolean;
  initialPolls: LivePoll[];
  initialVotes: VoteRow[];
}) {
  const [polls, setPolls] = useState<LivePoll[]>(initialPolls);
  const [votes, setVotes] = useState<VoteRow[]>(initialVotes);
  const [showCreate, setShowCreate] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => setPolls(initialPolls), [initialPolls]);
  useEffect(() => setVotes(initialVotes), [initialVotes]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live_polls:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_polls", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setPolls((prev) => prev.filter((p) => p.id !== old.id));
            return;
          }
          const p = payload.new as LivePoll;
          setPolls((prev) => {
            const exists = prev.some((x) => x.id === p.id);
            return exists ? prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)) : [...prev, p];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_poll_votes" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as VoteRow;
            setVotes((prev) =>
              prev.filter((v) => !(v.poll_id === old.poll_id && v.user_id === old.user_id))
            );
            return;
          }
          const v = payload.new as VoteRow;
          setVotes((prev) => {
            const others = prev.filter(
              (x) => !(x.poll_id === v.poll_id && x.user_id === v.user_id)
            );
            return [...others, v];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  function handleVote(pollId: string, optionIndex: number) {
    setVotes((prev) => {
      const others = prev.filter((v) => !(v.poll_id === pollId && v.user_id === meId));
      return [...others, { poll_id: pollId, user_id: meId, option_index: optionIndex }];
    });
    startTransition(async () => {
      await voteLivePoll(pollId, optionIndex);
    });
  }

  function handleClose(pollId: string) {
    setPolls((prev) => prev.map((p) => (p.id === pollId ? { ...p, status: "closed" } : p)));
    startTransition(async () => {
      await closeLivePoll(pollId, sessionId, slug);
    });
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createLivePoll(formData);
      setShowCreate(false);
    });
  }

  const sorted = [...polls].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-small font-bold uppercase tracking-wide text-text-secondary">Polls</h2>
        {canModerate && (
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="rounded-sm border border-border px-2.5 py-1 text-caption font-semibold text-primary hover:border-primary"
          >
            {showCreate ? "Cancel" : "＋ New poll"}
          </button>
        )}
      </div>

      {canModerate && showCreate && (
        <form action={handleCreate} className="mb-3 rounded-md border border-border bg-card p-3">
          <input type="hidden" name="session_id" value={sessionId} />
          <input type="hidden" name="slug" value={slug} />
          <input
            name="question"
            required
            placeholder="Poll question"
            className="w-full rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
          />
          <div className="mt-2 flex flex-col gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                name={`option_${i}`}
                placeholder={`Option ${i + 1}${i < 2 ? " (required)" : " (optional)"}`}
                required={i < 2}
                className="w-full rounded-sm border border-border px-3 py-1.5 text-small outline-none focus:border-primary"
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-sm bg-primary px-3 py-2 text-small font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Creating…" : "Launch poll"}
          </button>
        </form>
      )}

      {sorted.length === 0 && (
        <p className="text-small text-text-secondary">
          No polls yet{canModerate ? " — create one to gather the room." : "."}
        </p>
      )}

      <div className="space-y-2">
        {sorted.map((poll) => {
          const pollVotes = votes.filter((v) => v.poll_id === poll.id);
          const total = pollVotes.length;
          const myVote = pollVotes.find((v) => v.user_id === meId)?.option_index;
          const closed = poll.status === "closed";
          return (
            <div key={poll.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-small font-bold">{poll.question}</div>
                {closed && (
                  <span className="flex-none rounded-full bg-bg px-2 py-0.5 text-caption text-text-secondary">
                    closed
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {poll.options.map((opt, i) => {
                  const count = pollVotes.filter((v) => v.option_index === i).length;
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  const mine = myVote === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={closed || pending}
                      onClick={() => handleVote(poll.id, i)}
                      className={`relative overflow-hidden rounded-sm border px-3 py-1.5 text-left text-small transition ${
                        mine ? "border-primary" : "border-border hover:border-primary"
                      } ${closed ? "cursor-default" : ""}`}
                    >
                      <span
                        className="absolute inset-y-0 left-0 bg-[#eef2ff]"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                      <span className="relative flex items-center justify-between gap-2">
                        <span className={mine ? "font-semibold text-primary" : ""}>
                          {mine ? "✓ " : ""}
                          {opt}
                        </span>
                        <span className="text-caption text-text-secondary">{pct}%</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-caption text-text-secondary">
                <span>
                  {total} vote{total === 1 ? "" : "s"}
                </span>
                {canModerate && !closed && (
                  <button
                    type="button"
                    onClick={() => handleClose(poll.id)}
                    className="font-semibold hover:text-text"
                  >
                    Close poll
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
