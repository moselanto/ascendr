"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Source = { id: string; title: string; status: string; created_at: string };

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

  function show(kind: "ok" | "err", text: string) {
    setMsg({ kind, text });
  }

  // Shared handler: posts the response, refreshes the list on success.
  async function handleResponse(res: Response) {
    const data = await res.json();
    if (!res.ok) {
      show("err", data.error || "Could not add source.");
    } else {
      show("ok", `Added "${data.title}" (${data.chunks} chunks embedded).`);
      setTitle("");
      setContent("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
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
            {initialSources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="truncate text-[14px] font-medium text-ink">{s.title}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium capitalize ${
                    s.status === "ready" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
