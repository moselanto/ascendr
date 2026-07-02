"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  askQuestion,
  toggleQuestionVote,
  setQuestionStatus,
} from "../../../live-actions";
import {
  sendLiveChat,
  deleteLiveChat,
  touchPresence,
  leavePresence,
} from "../../../live-chat-actions";

type Question = {
  id: string;
  body: string;
  votes: number;
  status: string;
  anonymous: boolean;
  author_id: string;
  author_name: string;
  voted: boolean;
};

type ChatMsg = {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
};

type Participant = {
  user_id: string;
  full_name: string;
  role: string;
  hand_raised: boolean;
  last_seen_at: string;
};

const STATUS_PILL: Record<string, string> = {
  answered: "bg-[#ecfdf5] text-[#047857]",
  pinned: "bg-[#fef3c7] text-[#92400e]",
};

type Tab = "qa" | "chat" | "participants";

// A participant is considered "present" if seen in the last 45s.
const PRESENT_WINDOW_MS = 45_000;

export default function LiveRail({
  sessionId,
  communityId,
  slug,
  meId,
  isMod,
  isHost,
  initialQuestions,
  initialChat,
}: {
  sessionId: string;
  communityId: string;
  slug: string;
  meId: string;
  isMod: boolean;
  isHost: boolean;
  initialQuestions: Question[];
  initialChat: ChatMsg[];
}) {
  const [tab, setTab] = useState<Tab>("qa");
  const [, startTransition] = useTransition();

  // ---- shared supabase client (one per mount) ----
  const supaRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supaRef.current) supaRef.current = createClient();
  const supabase = supaRef.current;

  // =========================================================================
  // PRESENCE — heartbeat in, list of live participants, leave on unmount
  // =========================================================================
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refreshPresence() {
      const cutoff = new Date(Date.now() - PRESENT_WINDOW_MS).toISOString();
      const { data } = await supabase
        .from("session_presence")
        .select("user_id, role, hand_raised, last_seen_at, profiles:user_id(full_name)")
        .eq("session_id", sessionId)
        .gte("last_seen_at", cutoff)
        .order("hand_raised", { ascending: false })
        .order("joined_at", { ascending: true });
      if (cancelled || !data) return;
      setParticipants(
        data.map((p) => ({
          user_id: p.user_id,
          role: p.role,
          hand_raised: p.hand_raised,
          last_seen_at: p.last_seen_at,
          // @ts-expect-error supabase join shape
          full_name: p.profiles?.full_name ?? "Member",
        }))
      );
    }

    // Register presence immediately, then heartbeat every 20s.
    touchPresence(sessionId);
    refreshPresence();
    const beat = setInterval(() => {
      touchPresence(sessionId);
      refreshPresence();
    }, 20_000);

    const channel = supabase
      .channel(`live-presence-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_presence", filter: `session_id=eq.${sessionId}` },
        refreshPresence
      )
      .subscribe();

    const onUnload = () => leavePresence(sessionId);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      clearInterval(beat);
      window.removeEventListener("beforeunload", onUnload);
      supabase.removeChannel(channel);
      leavePresence(sessionId);
    };
  }, [sessionId, supabase]);

  const presentCount = participants.length;
  const raisedHands = participants.filter((p) => p.hand_raised);

  // =========================================================================
  // Q&A — realtime board (submit / upvote / pin / answer)
  // =========================================================================
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [qBody, setQBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    async function refresh() {
      const { data } = await supabase
        .from("live_questions")
        .select("id, body, votes, status, anonymous, author_id, profiles:author_id(full_name)")
        .eq("session_id", sessionId)
        .order("votes", { ascending: false })
        .order("created_at", { ascending: true });
      if (!data) return;
      const ids = data.map((q) => q.id);
      const votedSet = new Set<string>();
      if (ids.length) {
        const { data: myVotes } = await supabase
          .from("question_votes")
          .select("question_id")
          .eq("user_id", meId)
          .in("question_id", ids);
        (myVotes ?? []).forEach((v) => votedSet.add(v.question_id));
      }
      setQuestions(
        data.map((q) => ({
          id: q.id,
          body: q.body,
          votes: q.votes ?? 0,
          status: q.status,
          anonymous: q.anonymous,
          author_id: q.author_id,
          // @ts-expect-error supabase join shape
          author_name: q.profiles?.full_name ?? "Member",
          voted: votedSet.has(q.id),
        }))
      );
    }

    const channel = supabase
      .channel(`live-qa-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_questions", filter: `session_id=eq.${sessionId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "question_votes" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, meId, supabase]);

  function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!qBody.trim()) return;
    const fd = new FormData();
    fd.append("session_id", sessionId);
    fd.append("community_id", communityId);
    fd.append("slug", slug);
    fd.append("body", qBody);
    if (anonymous) fd.append("anonymous", "on");
    setQBody("");
    setAnonymous(false);
    startTransition(() => askQuestion(fd));
  }

  function vote(q: Question) {
    setQuestions((prev) =>
      prev.map((x) =>
        x.id === q.id ? { ...x, voted: !x.voted, votes: x.votes + (x.voted ? -1 : 1) } : x
      )
    );
    startTransition(() => toggleQuestionVote(q.id, sessionId, slug));
  }

  function markQuestion(q: Question, status: string) {
    const fd = new FormData();
    fd.append("question_id", q.id);
    fd.append("session_id", sessionId);
    fd.append("community_id", communityId);
    fd.append("slug", slug);
    fd.append("status", status);
    startTransition(() => setQuestionStatus(fd));
  }

  const orderedQuestions = [...questions].sort((a, b) => {
    if (a.status === "pinned" && b.status !== "pinned") return -1;
    if (b.status === "pinned" && a.status !== "pinned") return 1;
    return b.votes - a.votes;
  });

  // =========================================================================
  // CHAT — realtime side chat
  // =========================================================================
  const [chat, setChat] = useState<ChatMsg[]>(initialChat);
  const [chatBody, setChatBody] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function refresh() {
      const { data } = await supabase
        .from("live_chat_messages")
        .select("id, body, author_id, created_at, profiles:author_id(full_name)")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!data) return;
      setChat(
        data.map((m) => ({
          id: m.id,
          body: m.body,
          author_id: m.author_id,
          created_at: m.created_at,
          // @ts-expect-error supabase join shape
          author_name: m.profiles?.full_name ?? "Member",
        }))
      );
    }

    const channel = supabase
      .channel(`live-chat-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_chat_messages", filter: `session_id=eq.${sessionId}` }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    if (tab === "chat") chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, tab]);

  function submitChat(e: React.FormEvent) {
    e.preventDefault();
    const body = chatBody.trim();
    if (!body) return;
    // Optimistic append.
    setChat((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, body, author_id: meId, author_name: "You", created_at: new Date().toISOString() },
    ]);
    setChatBody("");
    const fd = new FormData();
    fd.append("session_id", sessionId);
    fd.append("community_id", communityId);
    fd.append("slug", slug);
    fd.append("body", body);
    startTransition(() => sendLiveChat(fd));
  }

  function removeChat(m: ChatMsg) {
    setChat((prev) => prev.filter((x) => x.id !== m.id));
    const fd = new FormData();
    fd.append("message_id", m.id);
    fd.append("session_id", sessionId);
    fd.append("slug", slug);
    startTransition(() => deleteLiveChat(fd));
  }

  // =========================================================================
  // Render
  // =========================================================================
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "qa", label: "Q&A", count: questions.length },
    { key: "chat", label: "Chat", count: chat.length },
    { key: "participants", label: "Participants", count: presentCount },
  ];

  return (
    <div className="flex h-[560px] flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 border-b-2 px-2 py-2.5 text-small font-semibold ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span className="ml-1 text-caption text-text-secondary">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ============ Q&A ============ */}
      {tab === "qa" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <ul className="flex-1 space-y-2 overflow-auto py-3">
            {orderedQuestions.length === 0 && (
              <li className="px-1 text-small text-text-secondary">No questions yet — be the first to ask.</li>
            )}
            {orderedQuestions.map((q) => (
              <li
                key={q.id}
                className={`flex gap-3 rounded-md border bg-card px-3 py-2.5 ${
                  q.status === "pinned" ? "border-[#f59e0b]" : "border-border"
                }`}
              >
                <button
                  onClick={() => vote(q)}
                  className={`flex flex-col items-center rounded-sm border px-2 py-1 text-caption font-bold ${
                    q.voted ? "border-primary bg-[#eef2ff] text-primary" : "border-border text-text-secondary"
                  }`}
                  aria-pressed={q.voted}
                >
                  <span aria-hidden>▲</span>
                  <span>{q.votes}</span>
                </button>
                <div className="flex-1">
                  <p className={`text-small ${q.status === "answered" ? "text-text-secondary line-through" : ""}`}>
                    {q.body}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-caption text-text-secondary">
                      {q.anonymous ? "Anonymous" : q.author_name}
                    </span>
                    {q.status !== "open" && (
                      <span className={`rounded-full px-2 py-0.5 text-caption font-semibold capitalize ${STATUS_PILL[q.status] ?? ""}`}>
                        {q.status}
                      </span>
                    )}
                  </div>
                  {isMod && (
                    <div className="mt-2 flex gap-3">
                      <button onClick={() => markQuestion(q, q.status === "answered" ? "open" : "answered")} className="text-caption font-semibold text-primary">
                        {q.status === "answered" ? "Reopen" : "Mark answered"}
                      </button>
                      <button onClick={() => markQuestion(q, q.status === "pinned" ? "open" : "pinned")} className="text-caption font-semibold text-[#92400e]">
                        {q.status === "pinned" ? "Unpin" : "Pin"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={submitQuestion} className="border-t border-border pt-3">
            <input
              value={qBody}
              onChange={(e) => setQBody(e.target.value)}
              placeholder="Ask a question…"
              className="w-full rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
            />
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-caption text-text-secondary">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                Ask anonymously
              </label>
              <button
                type="submit"
                disabled={!qBody.trim()}
                className="rounded-sm bg-primary px-4 py-1.5 text-small font-semibold text-white disabled:opacity-50"
              >
                Submit a question
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ CHAT ============ */}
      {tab === "chat" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-2.5 overflow-auto py-3">
            {chat.length === 0 && (
              <p className="px-1 text-small text-text-secondary">Say hi — the chat is quiet so far.</p>
            )}
            {chat.map((m) => {
              const mine = m.author_id === meId;
              return (
                <div key={m.id} className="group flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-caption font-semibold ${mine ? "text-primary" : "text-text-primary"}`}>
                      {mine ? "You" : m.author_name}
                    </span>
                    <span className="text-caption text-text-secondary">
                      {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                    {(mine || isMod) && !m.id.startsWith("tmp-") && (
                      <button
                        onClick={() => removeChat(m)}
                        className="ml-auto text-caption text-text-secondary opacity-0 group-hover:opacity-100 hover:text-danger"
                        title="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-small">{m.body}</p>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={submitChat} className="flex gap-2 border-t border-border pt-3">
            <input
              value={chatBody}
              onChange={(e) => setChatBody(e.target.value)}
              placeholder="Message the room…"
              className="flex-1 rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!chatBody.trim()}
              className="rounded-sm bg-primary px-4 py-2 text-small font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* ============ PARTICIPANTS ============ */}
      {tab === "participants" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto py-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-caption font-bold uppercase tracking-wide text-text-secondary">
              In the room
            </span>
            <span className="flex items-center gap-1 text-caption text-text-secondary">
              <span className="inline-block h-2 w-2 rounded-full bg-accent" />
              {presentCount} present
            </span>
          </div>

          {raisedHands.length > 0 && (
            <div className="mb-2 rounded-md border border-[#f59e0b] bg-[#fffbeb] px-3 py-2">
              <span className="text-caption font-semibold text-[#92400e]">
                Raised hands ({raisedHands.length})
              </span>
              <div className="mt-1 flex flex-col gap-1">
                {raisedHands.map((p) => (
                  <span key={p.user_id} className="text-small text-[#92400e]">
                    ✋ {p.user_id === meId ? "You" : p.full_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <ul className="space-y-1">
            {participants.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2.5 rounded-sm px-1 py-1.5">
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-caption font-bold text-white">
                  {(p.full_name || "M").slice(0, 1).toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-accent" />
                </span>
                <span className="text-small font-semibold">
                  {p.user_id === meId ? "You" : p.full_name}
                </span>
                {p.hand_raised && <span title="Hand raised">✋</span>}
                {p.role !== "viewer" && (
                  <span className="ml-auto rounded-full bg-[#eef2ff] px-2 py-0.5 text-caption font-semibold capitalize text-primary">
                    {p.role}
                  </span>
                )}
              </li>
            ))}
            {participants.length === 0 && (
              <li className="px-1 text-small text-text-secondary">No one here yet.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
