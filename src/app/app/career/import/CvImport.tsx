"use client";

import { useState } from "react";
import Link from "next/link";
import { saveCvSkills, setGoalFromCv } from "./actions";
import type { CvAnalysis } from "@/lib/career/cv";

const btn = "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[14px] font-medium transition-colors disabled:opacity-50";
const card = "rounded-2xl border border-border bg-white p-5 shadow-card md:p-6";

export default function CvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvAnalysis | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<string | null>(null);
  const [goalSet, setGoalSet] = useState<string | null>(null);

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setGoalSet(null);
    if (!file && text.trim().length < 200) {
      setError("Upload a PDF, or paste at least a few lines of your CV.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      else fd.append("text", text);
      const res = await fetch("/api/ai/cv-import", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.analysis) {
        setError(data.error || "Something went wrong reading your CV. Please try again.");
        return;
      }
      const a = data.analysis as CvAnalysis;
      setResult(a);
      setPicked(new Set(a.skills.filter((s) => !s.alreadyHeld).map((s) => s.skillId)));
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    const res = await saveCvSkills(Array.from(picked));
    setBusy(false);
    setSaved(res.ok ? `${res.saved} ${res.saved === 1 ? "skill" : "skills"} added to your profile.` : "Could not save. Please try again.");
  }

  async function makeGoal(roleId: string, title: string) {
    setBusy(true);
    const res = await setGoalFromCv(roleId);
    setBusy(false);
    setGoalSet(res.ok ? `Your goal is now ${title}.` : "Could not update your goal. Please try again.");
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={analyse} className={card}>
        <p className="text-[15px] font-semibold text-ink">Upload your CV</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          PDF, up to 5 MB. To use LinkedIn: open your LinkedIn profile, click <b>More</b> (or <b>Resources</b>), choose{" "}
          <b>Save to PDF</b>, then upload that file here.
        </p>
        <input
          type="file"
          accept="application/pdf,.pdf,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-4 block w-full text-[14px] text-ink file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-ink"
        />
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-text-secondary hover:text-ink">Or paste your CV text</summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste your CV or LinkedIn About and Experience sections"
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40"
          />
        </details>
        {error && <p role="alert" className="mt-3 text-[13px] text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className={`${btn} mt-4 bg-ink text-white hover:bg-ink-700`}>
          {busy && !result ? "Reading your CV…" : result ? "Analyse again" : "Analyse my CV"}
        </button>
      </form>

      {result && (
        <>
          <section className={card}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-secondary">From your CV</p>
            <p className="mt-1 text-[18px] font-semibold text-ink">
              {result.currentTitle ?? "Current role not found"}
              {result.yearsExperience != null && (
                <span className="text-[14px] font-normal text-text-secondary"> {"·"} about {result.yearsExperience} years</span>
              )}
            </p>
            {result.summary && <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{result.summary}</p>}
            {result.strengths.length > 0 && (
              <>
                <p className="mt-4 text-[14px] font-semibold text-ink">Your strengths</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px] text-ink">
                  {result.strengths.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </>
            )}
          </section>

          <section className={card}>
            <p className="text-[15px] font-semibold text-ink">Skills we found ({result.skills.length})</p>
            <p className="mt-1 text-[13px] text-text-secondary">Untick anything that is not right, then add the rest to your profile.</p>
            {result.skills.length === 0 ? (
              <p className="mt-3 text-[14px] text-text-secondary">No catalogue skills were clearly shown in this CV.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {result.skills.map((s) => (
                  <li key={s.skillId} className="flex items-start gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={s.alreadyHeld || picked.has(s.skillId)}
                      disabled={s.alreadyHeld}
                      onChange={() => toggle(s.skillId)}
                      className="mt-1"
                      aria-label={s.label}
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium capitalize text-ink">
                        {s.label}
                        {s.alreadyHeld && <span className="ml-2 text-[12px] font-normal normal-case text-text-secondary">already on your profile</span>}
                      </p>
                      {s.evidence && <p className="text-[12px] text-text-secondary">{s.evidence}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {result.otherSkills.length > 0 && (
              <p className="mt-3 text-[12px] text-text-secondary">Also mentioned, not in our catalogue yet: {result.otherSkills.join(", ")}</p>
            )}
            {picked.size > 0 && (
              <button type="button" onClick={save} disabled={busy} className={`${btn} mt-4 bg-ink text-white hover:bg-ink-700`}>
                Add {picked.size} {picked.size === 1 ? "skill" : "skills"} to my profile
              </button>
            )}
            {saved && <p className="mt-3 text-[13px] text-emerald-800">{saved}</p>}
          </section>

          <section className={card}>
            <p className="text-[15px] font-semibold text-ink">Roles you are closest to</p>
            <p className="mt-1 text-[13px] text-text-secondary">Based on the essential skills for each role, including skills already on your profile.</p>
            <ul className="mt-3 space-y-4">
              {result.roles.map((r) => (
                <li key={r.roleId} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold capitalize text-ink">{r.title}</p>
                    <span className="nums text-[13px] font-medium text-ink">
                      {r.coverage}% {"·"} {r.essentialHeld} of {r.essentialTotal} essential skills
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-surface">
                    <div className="h-1.5 rounded-full bg-ink" style={{ width: `${r.coverage}%` }} />
                  </div>
                  {r.missing.length > 0 && (
                    <p className="mt-2 text-[13px] text-text-secondary">
                      Improve next: <span className="text-ink">{r.missing.map((m) => m.label).join(", ")}</span>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => makeGoal(r.roleId, r.title)}
                    disabled={busy}
                    className={`${btn} mt-3 border border-ink/15 bg-white px-4 py-2 text-[13px] text-ink hover:border-ink/40`}
                  >
                    Make this my goal
                  </button>
                </li>
              ))}
            </ul>
            {goalSet && (
              <p className="mt-3 text-[13px] text-emerald-800">
                {goalSet}{" "}
                <Link href="/app/career" className="font-medium underline-offset-4 hover:underline">See your career plan</Link>
              </p>
            )}
          </section>

          {result.improvements.length > 0 && (
            <section className={card}>
              <p className="text-[15px] font-semibold text-ink">Make your CV stronger</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] text-ink">
                {result.improvements.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
