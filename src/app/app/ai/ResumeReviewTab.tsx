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

function scoreChip(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-800";
  if (score >= 60) return "bg-amber-50 text-amber-800";
  return "bg-surface text-danger";
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
    <div className="grid gap-5 md:grid-cols-2">
      {/* YOUR RESUME */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Your resume</p>
        <h2 className="mt-1 text-[17px] font-semibold text-ink">Get a scored review</h2>

        <form onSubmit={review_} className="mt-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-[14px] text-text-secondary hover:border-ink/40">
            <span aria-hidden className="text-ink">↑</span>
            <span className="flex-1 truncate">
              {fileName ? `${fileName} selected` : "Upload a .txt/.md file or paste below"}
            </span>
            <input type="file" accept=".txt,.md,text/*" onChange={onFile} className="hidden" />
          </label>

          <label htmlFor="rr-role" className="mt-4 block text-[12px] font-medium text-text-secondary">
            Target role
          </label>
          <input
            id="rr-role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Product Manager"
            className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
          />

          <label htmlFor="rr-text" className="mt-4 block text-[12px] font-medium text-text-secondary">
            Resume text
          </label>
          <textarea
            id="rr-text"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={9}
            placeholder="Paste your resume text here…"
            className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
          />

          <button
            type="submit"
            disabled={resumeText.trim().length < 40 || loading}
            className="mt-4 w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50"
          >
            {loading ? "Reviewing…" : "Review my resume →"}
          </button>
          {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
        </form>

        {review && (
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium text-text-secondary">
                {review.file_name || "Your resume"}
                {review.target_role ? ` · ${review.target_role}` : ""}
              </div>
              {review.verdict && <div className="mt-1 text-[14px] text-ink">{review.verdict}</div>}
            </div>
            <div className="flex shrink-0 items-end gap-1">
              <span className="text-[40px] font-semibold leading-none tracking-[-0.02em] text-ink">
                {review.score ?? "—"}
              </span>
              <span className="mb-1 text-[13px] text-text-secondary">/100</span>
            </div>
          </div>
        )}
        {review && review.score != null && (
          <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[12px] font-semibold ${scoreChip(review.score)}`}>
            {review.score >= 80 ? "Strong" : review.score >= 60 ? "Solid, needs polish" : "Needs work"}
          </span>
        )}
      </div>

      {/* FIXES */}
      <div className="h-fit rounded-2xl border border-border bg-white p-0 shadow-card">
        <div className="border-b border-border px-5 py-4">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
            Strengths &amp; fixes
          </span>
        </div>

        {!review ? (
          <div className="p-10 text-center">
            <p className="text-[15px] font-semibold text-ink">No review yet</p>
            <p className="mt-1 text-[14px] text-text-secondary">
              Paste your resume to see strengths, prioritized fixes and a suggested rewrite.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {review.strengths.map((s, i) => (
                <li key={`s-${i}`} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-800">
                    ✓
                  </span>
                  <span className="text-[14px] text-ink">{s}</span>
                </li>
              ))}
              {review.fixes.map((f, i) => (
                <li key={`f-${i}`} className="flex items-start gap-3 px-5 py-4">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      f.severity === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {f.severity === "ok" ? "✓" : "!"}
                  </span>
                  <span className="text-[14px] text-ink">{f.text}</span>
                </li>
              ))}
            </ul>

            {review.rewrite && (
              <div className="border-t border-border bg-surface px-5 py-4">
                <p className="text-[12px] font-medium text-text-secondary">Suggested rewrite</p>
                <p className="mt-1 text-[14px] text-ink">&ldquo;{review.rewrite}&rdquo;</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
