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
      show("ok", `Added "${data.title}" — ${data.chunks} chunks embedded.`);
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
      <form onSubmit={submitText} className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <label className="block text-sm font-medium text-[#0F172A]">Source title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. My interview prep framework"
          className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
        />

        <label className="mt-4 block text-sm font-medium text-[#0F172A]">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Paste a playbook, FAQ answers, a talk transcript, or your written advice. The more specific, the better the clone."
          className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Embedding…" : "Add to my AI clone"}
          </button>

          <span className="text-sm text-[#64748B]">or</span>

          {/* File upload — uses the title field above as the source title if set */}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-[#4F46E5] px-4 py-2 text-sm font-medium text-[#4F46E5] disabled:opacity-50"
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
            <span className={`text-sm ${msg.kind === "ok" ? "text-[#10B981]" : "text-[#EF4444]"}`}>
              {msg.text}
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-[#64748B]">
          Upload supports .txt, .md, and .csv files (up to 2 MB). For PDFs, copy the text and paste it
          for now — PDF parsing is coming next.
        </p>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#0F172A]">Your sources</h2>
        {initialSources.length === 0 ? (
          <p className="text-sm text-[#64748B]">No sources yet. Add your first one above.</p>
        ) : (
          <ul className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] bg-white">
            {initialSources.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[#0F172A]">{s.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    s.status === "ready"
                      ? "bg-[#10B981]/10 text-[#10B981]"
                      : "bg-[#F59E0B]/10 text-[#F59E0B]"
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
