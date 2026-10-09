"use client";

import { useMemo, useState } from "react";
import {
  NETWORK,
  ROLES,
  SKILL_SUPPLY,
  PERSONAS,
  type Band,
  type Candidate,
} from "@/lib/networks/demo";

/**
 * Interactive preview of ASCENDR Networks. Client component because it is
 * stateful (tabs, selections, intro requests). All data is sample data from
 * lib/networks/demo.ts and the UI says so.
 */

const BAND_STYLE: Record<Band, { label: string; dot: string; chip: string }> = {
  strong: { label: "Ready now", dot: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  partial: { label: "Within 90 days", dot: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-800" },
  stretch: { label: "Developing", dot: "bg-brand-400", chip: "border-brand-200 bg-brand-50 text-brand-700" },
};

const BAND_ORDER: Band[] = ["strong", "partial", "stretch"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Network view                                                        */
/* ------------------------------------------------------------------ */

function CandidateCard({
  c,
  requested,
  onRequest,
}: {
  c: Candidate;
  requested: boolean;
  onRequest: () => void;
}) {
  return (
    <li className="rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-[12px] font-semibold text-ink">
          {initials(c.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{c.name}</p>
          <p className="truncate text-[13px] text-text-secondary">{c.current}</p>
          <p className="text-[12px] text-text-secondary/80">{c.location}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {c.reasons.map((r) => (
          <li key={r} className="flex gap-2 text-[13px] text-ink/80">
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
            {r}
          </li>
        ))}
      </ul>

      {c.missing.length > 0 && (
        <p className="mt-2 text-[13px] text-text-secondary">
          <span className="font-medium text-ink">Missing:</span> {c.missing.join(", ")}
        </p>
      )}

      <button
        type="button"
        onClick={onRequest}
        disabled={requested}
        className={`mt-4 w-full rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${
          requested
            ? "cursor-default bg-emerald-50 text-emerald-800"
            : "border border-ink/15 text-ink hover:border-ink/40"
        }`}
      >
        {requested ? "Intro requested" : c.band === "strong" ? "Request intro" : "Follow progress"}
      </button>
    </li>
  );
}

function NetworkView() {
  const [roleId, setRoleId] = useState(ROLES[0].id);
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [assigned, setAssigned] = useState<Record<string, boolean>>({});

  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
  const byBand = useMemo(() => {
    const out: Record<Band, Candidate[]> = { strong: [], partial: [], stretch: [] };
    role.candidates.forEach((c) => out[c.band].push(c));
    return out;
  }, [role]);

  const partialCount = byBand.partial.length;
  const isAssigned = Boolean(assigned[role.id]);
  const maxSupply = Math.max(...SKILL_SUPPLY.map((s) => Math.max(s.demand, s.have + s.learning)));

  return (
    <div className="space-y-6">
      {/* Org header + KPIs */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-text-secondary">{NETWORK.kind}</p>
          <p className="text-[22px] font-semibold tracking-tight text-ink">{NETWORK.name}</p>
        </div>
        <p className="text-[13px] text-text-secondary">
          {NETWORK.members.toLocaleString()} members · {NETWORK.companies} portfolio companies
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 lg:grid-cols-4">
        {NETWORK.kpis.map((k) => (
          <div key={k.label} className="bg-white p-4">
            <p className="nums text-[26px] font-semibold tracking-tight text-ink">{k.value}</p>
            <p className="text-[13px] font-medium text-ink">{k.label}</p>
            <p className="text-[12px] text-text-secondary">{k.note}</p>
          </div>
        ))}
      </div>

      {/* Role picker */}
      <div>
        <p className="text-[13px] font-medium text-ink">Open roles across the portfolio</p>
        <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label="Portfolio roles">
          {ROLES.map((r) => {
            const active = r.id === roleId;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRoleId(r.id)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                  active ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink hover:border-ink/40"
                }`}
              >
                {r.title} · {r.company}
              </button>
            );
          })}
        </div>
      </div>

      {/* Role summary */}
      <div className="rounded-xl border border-ink/10 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[18px] font-semibold text-ink">
              {role.title} <span className="font-normal text-text-secondary">at {role.company}</span>
            </p>
            <p className="text-[13px] text-text-secondary">{role.stage}</p>
          </div>
          <div className="flex gap-4 text-[13px]">
            {BAND_ORDER.map((b) => (
              <span key={b} className="flex items-center gap-1.5 text-ink">
                <span className={`h-2 w-2 rounded-full ${BAND_STYLE[b].dot}`} />
                <span className="nums font-semibold">{byBand[b].length}</span>
                <span className="text-text-secondary">{BAND_STYLE[b].label.toLowerCase()}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {role.coreSkills.map((s) => (
            <span key={s} className="rounded-md bg-surface px-2 py-0.5 text-[12px] text-text-secondary">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Pipeline columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {BAND_ORDER.map((b) => (
          <div key={b} className="rounded-xl bg-surface p-3">
            <div className="flex items-center justify-between px-1 pb-3">
              <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${BAND_STYLE[b].chip}`}>
                {BAND_STYLE[b].label}
              </span>
              <span className="nums text-[13px] text-text-secondary">{byBand[b].length}</span>
            </div>

            {byBand[b].length === 0 ? (
              <p className="px-1 pb-2 text-[13px] text-text-secondary">No one in this band yet.</p>
            ) : (
              <ul className="space-y-3">
                {byBand[b].map((c) => (
                  <CandidateCard
                    key={c.id}
                    c={c}
                    requested={Boolean(requested[c.id])}
                    onRequest={() => setRequested((s) => ({ ...s, [c.id]: true }))}
                  />
                ))}
              </ul>
            )}

            {b === "partial" && partialCount > 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-ink/20 bg-white p-4">
                <p className="text-[13px] text-ink">
                  Grow supply instead of searching for it: give these {partialCount} members the{" "}
                  <span className="font-medium">{role.path}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setAssigned((s) => ({ ...s, [role.id]: true }))}
                  disabled={isAssigned}
                  className={`mt-3 w-full rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${
                    isAssigned ? "cursor-default bg-emerald-50 text-emerald-800" : "bg-ink text-white hover:bg-ink-700"
                  }`}
                >
                  {isAssigned ? `Path assigned to ${partialCount} members` : "Assign learning path"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Supply vs demand */}
      <div className="rounded-xl border border-ink/10 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[16px] font-semibold text-ink">Skill supply vs portfolio demand</p>
            <p className="text-[13px] text-text-secondary">
              People who have each skill, people learning it, and how many the portfolio needs.
            </p>
          </div>
          <div className="flex gap-4 text-[12px] text-text-secondary">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-ink" />Have it</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-ink/25" />Learning</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-danger" />Needed</span>
          </div>
        </div>

        <ul className="mt-5 space-y-4">
          {SKILL_SUPPLY.map((s) => {
            const short = s.have < s.demand;
            return (
              <li key={s.skill} className="grid grid-cols-[130px_1fr] items-center gap-4 sm:grid-cols-[170px_1fr_120px]">
                <span className="text-[13px] font-medium text-ink">{s.skill}</span>
                <div className="relative h-3 rounded-full bg-surface">
                  <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-full" style={{ width: `${((s.have + s.learning) / maxSupply) * 100}%` }}>
                    <div className="h-full bg-ink" style={{ width: `${(s.have / (s.have + s.learning)) * 100}%` }} />
                    <div className="h-full flex-1 bg-ink/25" />
                  </div>
                  <span
                    aria-hidden
                    className="absolute -top-1 h-5 w-0.5 bg-danger"
                    style={{ left: `${(s.demand / maxSupply) * 100}%` }}
                  />
                </div>
                <span className={`col-span-2 text-[12px] sm:col-span-1 sm:text-right ${short ? "text-danger" : "text-emerald-700"}`}>
                  {short ? `Short by ${s.demand - s.have} today` : "Covered"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Member view                                                         */
/* ------------------------------------------------------------------ */

function MemberView() {
  const [personaId, setPersonaId] = useState(PERSONAS[0].id);
  const [step, setStep] = useState(0);
  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];
  const current = persona.steps[step];
  const last = persona.steps.length - 1;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-medium text-ink">Pick a member</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {PERSONAS.map((p) => {
            const active = p.id === personaId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPersonaId(p.id);
                  setStep(0);
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  active ? "border-ink bg-white shadow-card" : "border-ink/10 bg-white/60 hover:border-ink/30"
                }`}
              >
                <p className="text-[15px] font-semibold text-ink">{p.name}</p>
                <p className="text-[13px] text-text-secondary">
                  {p.from} <span aria-hidden>→</span> {p.to}
                </p>
                <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${BAND_STYLE[p.band].chip}`}>
                  {p.band === "strong" ? "Strong fit" : p.band === "partial" ? "Partial fit" : "Stretch goal"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex gap-1.5 overflow-x-auto pb-1">
        {persona.steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.key} className="min-w-[88px] flex-1">
              <button type="button" onClick={() => setStep(i)} className="w-full text-left" aria-current={active ? "step" : undefined}>
                <span className={`block h-1 rounded-full ${active ? "bg-ink" : done ? "bg-ink/40" : "bg-ink/10"}`} />
                <span className={`mt-2 block text-[12px] ${active ? "font-semibold text-ink" : "text-text-secondary"}`}>
                  {String(i + 1).padStart(2, "0")} {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Step panel */}
      <div key={`${persona.id}-${current.key}`} className="animate-[fadeUp_.35s_ease] rounded-xl border border-ink/10 bg-white p-6">
        <p className="text-[13px] text-text-secondary">
          {persona.name} · {current.label}
        </p>
        <p className="mt-1 text-[22px] font-semibold leading-snug tracking-tight text-ink">{current.title}</p>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-secondary">{current.body}</p>

        {current.items && (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {current.items.map((it) => (
              <li
                key={it.name}
                className={`rounded-lg border p-4 ${
                  it.tag === "have"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : it.tag === "gap"
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-ink/[0.08] bg-surface/50"
                }`}
              >
                <p className="text-[15px] font-semibold text-ink">{it.name}</p>
                <p className="text-[13px] text-text-secondary">{it.detail}</p>
                {it.reasons && (
                  <ul className="mt-2 space-y-1">
                    {it.reasons.map((r) => (
                      <li key={r} className="flex gap-2 text-[13px] text-ink/80">
                        <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-ink/[0.07] pt-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-[14px] font-medium text-ink disabled:text-ink/30"
          >
            ← Back
          </button>
          <span className="nums text-[13px] text-text-secondary">
            {step + 1} / {persona.steps.length}
          </span>
          <button
            type="button"
            onClick={() => setStep((s) => (s === last ? 0 : s + 1))}
            className="rounded-full bg-ink px-5 py-2 text-[14px] font-medium text-white hover:bg-ink-700"
          >
            {step === last ? "Start again" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function NetworkDemo() {
  const [tab, setTab] = useState<"network" | "member">("network");

  return (
    <div className="overflow-hidden rounded-3xl border border-ink/10 bg-[#FAFAFC] shadow-[0_1px_2px_rgba(11,18,32,0.04),0_30px_70px_-30px_rgba(11,18,32,0.25)]">
      <div className="flex flex-col gap-3 border-b border-ink/10 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full bg-surface p-1" role="tablist" aria-label="Demo view">
          {(
            [
              ["network", "Network view"],
              ["member", "Member view"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${
                tab === id ? "bg-white text-ink shadow-sm" : "text-text-secondary hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-text-secondary">Interactive preview · sample network, invented people</p>
      </div>

      <div className="p-5 md:p-8">{tab === "network" ? <NetworkView /> : <MemberView />}</div>
    </div>
  );
}
