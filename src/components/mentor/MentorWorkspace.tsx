"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Source = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  total_chunks?: number | null;
  done_chunks?: number | null;
  error?: string | null;
};

type Progress = { status: string; total: number; done: number; error?: string };

export function MentorWorkspace({
  communityId,
  initialSources,
}: {
  communityId: string;
  initialSources: Source[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});

  // Embeds the rest of a source batch by batch (migration 0025). Each call does
  // a few seconds of work, so large files never hit the request time limit.
  async function finish(sourceId: string, start?: Progress) {
    let p: Progress = start ?? { status: "processing", total: 0, done: 0 };
    setProgress((m) => ({ ...m, [sourceId]: p }));
    for (let i = 0; i < 400 && p.status === "processing"; i++) {
      try {
        const res = await fetch("/api/ai/mentor/ingest/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_id: sourceId }),
        });
        const data = (await res.json()) as Progress & { error?: string };
        p = { status: data.status ?? "failed", total: data.total ?? p.total, done: data.done ?? p.done, error: data.error };
      } catch {
        p = { ...p, status: "failed", error: "Network error. Resume to continue." };
      }
      setProgress((m) => ({ ...m, [sourceId]: p }));
    }
    router.refresh();
    return p;
  }

  function show(kind: "ok" | "err", text: string) {
    setMsg({ kind, text });
  }

  // Shared handler: posts the response, refreshes the list on success.
  async function handleResponse(res: Response) {
    const data = await res.json();
    if (!res.ok) {
      show("err", data.error || "Could not add source.");
      return;
    }
    setTitle("");
    setContent("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
    let p: Progress = { status: data.status, total: data.total, done: data.done, error: data.error };
    if (p.status === "processing") {
      show("ok", `Adding "${data.title}". You can keep working while it finishes.`);
      p = await finish(data.source_id, p);
    }
    if (p.status === "ready") show("ok", `Added "${data.title}" (${p.total} sections ready).`);
    else if (p.status === "failed") show("err", p.error || "Could not finish this source. Use Resume to try again.");
  }

  // Paste-text submit (JSON).
  async function submitText(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ai/mentor/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: communityId, title: title.trim() || "Untitled source", content }),
      });
      await handleResponse(res);
    } catch {
      show("err", "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // File upload (multipart form-data).
  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("community_id", communityId);
      fd.append("title", title.trim() || file.name);
      fd.append("file", file);
      const res = await fetch("/api/ai/mentor/ingest", { method: "POST", body: fd });
      await handleResponse(res);
    } catch {
      show("err", "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submitText} className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
        <h2 className="text-[17px] font-semibold text-ink">Add a source</h2>
        <p className="mt-0.5 text-[14px] text-text-secondary">Paste text or upload a file.</p>

        <label htmlFor="source-title" className="mt-5 block text-[12px] font-medium text-text-secondary">
          Source title
        </label>
        <input
          id="source-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. My interview prep framework"
          className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
        />

        <label htmlFor="source-content" className="mt-4 block text-[12px] font-medium text-text-secondary">
          Content
        </label>
        <textarea
          id="source-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Paste a playbook, FAQ answers, a talk transcript, or your written advice. The more specific, the better the clone."
          className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50"
          >
            {busy ? "Embedding…" : "Add to my AI clone"}
          </button>

          <span className="text-[14px] text-text-secondary">or</span>

          {/* File upload — uses the title field above as the source title if set */}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40 disabled:opacity-50"
          >
            Upload a file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.csv,.text"
            onChange={onFileChosen}
            className="hidden"
          />

          {msg && (
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-danger/10 text-danger"
              }`}
            >
              {msg.text}
            </span>
          )}
        </div>

        <p className="mt-3 text-[12px] text-text-secondary">
          Upload supports .txt, .md, and .csv files (up to 2 MB). For PDFs, copy the text and paste it for now. PDF
          parsing is coming next.
        </p>
      </form>

      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Your sources</h2>
        {initialSources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <div className="text-[15px] font-semibold text-ink">No sources yet</div>
            <p className="mt-1 text-[14px] text-text-secondary">
              Add your first source above to start training your clone.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
            {initialSources.map((s) => {
              const live = progress[s.id];
              const status = live?.status ?? s.status;
              const total = live?.total || s.total_chunks || 0;
              const done = live?.done ?? s.done_chunks ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const running = live?.status === "processing";
              const err = live?.error ?? s.error;
              return (
                <li key={s.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[14px] font-medium text-ink">{s.title}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {status !== "ready" && !running ? (
                        <button
                          type="button"
                          onClick={() => finish(s.id)}
                          className="rounded-full border border-ink/15 px-3 py-1 text-[12px] font-medium text-ink hover:border-ink/40"
                        >
                          Resume
                        </button>
                      ) : null}
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                          status === "ready" ? "bg-emerald-50 text-emerald-800" : status === "failed" ? "bg-danger/10 text-danger" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {status === "ready" ? "Ready" : status === "failed" ? "Stopped" : total > 0 ? `Processing ${pct}%` : "Processing"}
                      </span>
                    </div>
                  </div>
                  {status === "processing" && total > 0 ? (
                    <div className="mt-2 h-1.5 rounded-full bg-surface">
                      <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  ) : null}
                  {status === "failed" && err ? <p className="mt-1.5 text-[12px] text-danger">{err}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
