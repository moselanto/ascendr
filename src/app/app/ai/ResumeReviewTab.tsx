"use client";

import { useState } from "react";

type Fix = { severity: "ok" | "warn"; text: string };
type Review = {
  id: string;
  file_name: string | null;
  target_role: string | null;
  score: number | null;
  verdict: string | null;
  strengths: string[];
  fixes: Fix[];
  rewrite: string | null;
  created_at: string;
};

function scoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

export default function ResumeReviewTab({ latest }: { latest: Review | null }) {
  const [review, setReview] = useState<Review | null>(latest);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    // Read plain text files directly; for PDFs, ask the user to paste text
    // (client-side PDF parsing is out of scope — the text box is the reliable path).
    if (f.type.startsWith("text/") || f.name.endsWith(".txt") || f.name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = () => setResumeText(String(reader.result || ""));
      reader.readAsText(f);
    }
  }

  async function review_(e: React.FormEvent) {
    e.preventDefault();
    if (resumeText.trim().length < 40 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/resume-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, fileName: fileName || "resume.txt", targetRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not review resume");
      setReview(data.review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* YOUR RESUME */}
      <div className="rounded-md border border-border bg-card p-5">
        <div className="text-caption font-bold uppercase tracking-wide text-text-secondary">
          Your resume
        </div>

        <form onSubmit={review_} className="mt-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-3 py-2.5 text-small text-text-secondary hover:border-primary">
            <span aria-hidden>📎</span>
            <span className="flex-1 truncate">
              {fileName ? `${fileName} selected` : "Upload a .txt/.md file or paste below"}
            </span>
            <input type="file" accept=".txt,.md,text/*" onChange={onFile} className="hidden" />
          </label>

          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="Target role (e.g. Product Manager)"
            className="mt-3 w-full rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
          />

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={9}
            placeholder="Paste your resume text here…"
            className="mt-3 w-full rounded-sm border border-border px-3 py-2 text-small outline-none focus:border-primary"
          />

          <button
            type="submit"
            disabled={resumeText.trim().length < 40 || loading}
            className="mt-3 w-full rounded-sm bg-primary px-4 py-2.5 text-small font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Reviewing…" : "Review my resume"}
          </button>
          {error && <p className="mt-2 text-caption text-danger">{error}</p>}
        </form>

        {review && (
          <div className="mt-5 flex flex-col items-center border-t border-border pt-5">
            <div className="text-caption text-text-secondary">
              {review.file_name || "Your resume"}
            </div>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-[44px] font-bold leading-none" style={{ color: scoreColor(review.score ?? 0) }}>
                {review.score ?? "—"}
              </span>
              <span className="mb-1 text-small text-text-secondary">/100</span>
            </div>
            {review.verdict && (
              <div className="mt-1 text-small text-text-secondary">{review.verdict}</div>
            )}
          </div>
        )}
      </div>

      {/* FIXES */}
      <div className="rounded-md border border-border bg-card p-5">
        <div className="text-caption font-bold uppercase tracking-wide text-text-secondary">
          Fixes
        </div>

        {!review ? (
          <p className="mt-4 text-small text-text-secondary">
            Run a review to see strengths, prioritized fixes, and a suggested rewrite.
          </p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-border">
              {review.strengths.map((s, i) => (
                <li key={`s-${i}`} className="flex items-center gap-3 py-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ecfdf5] text-caption text-[#047857]">
                    ✓
                  </span>
                  <span className="text-small">{s}</span>
                </li>
              ))}
              {review.fixes.map((f, i) => (
                <li key={`f-${i}`} className="flex items-center gap-3 py-3">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-caption ${
                      f.severity === "ok" ? "bg-[#ecfdf5] text-[#047857]" : "bg-[#fffbeb] text-[#b45309]"
                    }`}
                  >
                    {f.severity === "ok" ? "✓" : "!"}
                  </span>
                  <span className="text-small">{f.text}</span>
                </li>
              ))}
            </ul>

            {review.rewrite && (
              <div className="mt-3 rounded-md border border-border bg-bg px-4 py-3">
                <span className="text-caption font-bold text-text-primary">Rewrite: </span>
                <span className="text-small text-text-secondary">&ldquo;{review.rewrite}&rdquo;</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
