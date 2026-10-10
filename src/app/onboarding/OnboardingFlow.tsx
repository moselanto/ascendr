"use client";

import { useState } from "react";
import { completeOnboarding } from "./actions";

/**
 * Calm, stepped goal capture. Every input stays mounted (hidden when not on
 * its step) so one submit posts all fields to the existing server action.
 */

const GOALS = [
  { id: "switch", title: "Switch careers", sub: "Move into a new field or role" },
  { id: "promote", title: "Get promoted", sub: "Grow in my current track" },
  { id: "startup", title: "Build a startup", sub: "Founder and growth support" },
  { id: "learn", title: "Learn a skill", sub: "Courses, paths and certificates" },
];

const HORIZONS = [
  { months: 3, label: "3 months", sub: "A focused sprint" },
  { months: 6, label: "6 months", sub: "A steady push" },
  { months: 12, label: "12 months", sub: "A real transition" },
  { months: 24, label: "2 years", sub: "The long game" },
];

const STEPS = [
  { key: "current", eyebrow: "Where you are", title: "What do you do", accent: "today?" },
  { key: "skills", eyebrow: "Your strengths", title: "Which skills do you", accent: "already have?" },
  { key: "target", eyebrow: "Where you are going", title: "Which role are you", accent: "aiming for?" },
  { key: "horizon", eyebrow: "Your pace", title: "When do you want to", accent: "get there?" },
] as const;

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-text-secondary/70 focus:border-ink/40";

export default function OnboardingFlow({ roles, firstName }: { roles: string[]; firstName: string | null }) {
  const [step, setStep] = useState(0);
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const last = step === STEPS.length - 1;
  const s = STEPS[step];
  const canContinue = step !== 2 || targetRole.trim().length > 0;

  return (
    <form
      action={completeOnboarding}
      onSubmit={() => setSubmitting(true)}
      className="w-full rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8"
    >
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">{s.eyebrow}</p>
        <p className="text-[12px] text-text-secondary nums">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden>
        {STEPS.map((x, i) => (
          <span key={x.key} className={`h-1 rounded-full transition-colors ${i <= step ? "bg-ink" : "bg-border"}`} />
        ))}
      </div>

      <h1 className="mt-6 text-[26px] font-semibold leading-tight tracking-tight text-ink">
        {step === 0 && firstName ? `${firstName}, what do you do` : s.title}{" "}
        <span className="accent-serif">{s.accent}</span>
      </h1>

      {/* Step 1: current role + goal kind */}
      <div className={step === 0 ? "mt-6 flex flex-col gap-5" : "hidden"}>
        <div>
          <label htmlFor="current_role" className="mb-1.5 block text-[13px] font-medium text-ink">
            Current role
          </label>
          <input
            id="current_role"
            name="current_role"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            placeholder="e.g. Customer support lead, final-year student"
            className={inputCls}
          />
        </div>
        <fieldset>
          <legend className="mb-2 block text-[13px] font-medium text-ink">What do you want to achieve?</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {GOALS.map((g, i) => (
              <label
                key={g.id}
                className="cursor-pointer rounded-xl border border-border bg-white p-3.5 transition-colors hover:border-ink/25 has-[:checked]:border-ink has-[:checked]:bg-surface"
              >
                <input type="radio" name="career_goal" value={g.id} defaultChecked={i === 0} className="sr-only" />
                <span className="block text-[14px] font-medium text-ink">{g.title}</span>
                <span className="mt-0.5 block text-[12px] text-text-secondary">{g.sub}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Step 2: skills */}
      <div className={step === 1 ? "mt-6" : "hidden"}>
        <label htmlFor="skills" className="mb-1.5 block text-[13px] font-medium text-ink">
          Skills <span className="font-normal text-text-secondary">(optional)</span>
        </label>
        <textarea
          id="skills"
          name="skills"
          rows={3}
          placeholder="e.g. SQL, stakeholder management, Figma"
          className={`${inputCls} resize-none`}
        />
        <p className="mt-2 text-[12px] text-text-secondary">Separate skills with commas. You can add evidence later.</p>
      </div>

      {/* Step 3: target role */}
      <div className={step === 2 ? "mt-6" : "hidden"}>
        <label htmlFor="target_roles" className="mb-1.5 block text-[13px] font-medium text-ink">
          Target role
        </label>
        {roles.length > 0 ? (
          <select
            id="target_roles"
            name="target_roles"
            required
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className={`${inputCls} appearance-none`}
          >
            <option value="">Choose a role ({roles.length} available)</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          // Only the roles in the catalogue can be analysed, so never accept free
          // text here: a typed title that matches no role leaves the member with
          // an empty career plan.
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900">
            Role options couldn&apos;t load right now. Use Skip for now and set your goal later from Career intelligence.
          </p>
        )}
        <p className="mt-2 text-[12px] text-text-secondary">
          We compare your skills against this role&apos;s requirements. You can change it any time.
        </p>
      </div>

      {/* Step 4: horizon */}
      <fieldset className={step === 3 ? "mt-6" : "hidden"}>
        <legend className="sr-only">Time horizon</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {HORIZONS.map((h, i) => (
            <label
              key={h.months}
              className="cursor-pointer rounded-xl border border-border bg-white p-3.5 transition-colors hover:border-ink/25 has-[:checked]:border-ink has-[:checked]:bg-surface"
            >
              <input type="radio" name="horizon_months" value={h.months} defaultChecked={i === 1} className="sr-only" />
              <span className="block text-[14px] font-medium text-ink">{h.label}</span>
              <span className="mt-0.5 block text-[12px] text-text-secondary">{h.sub}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((n) => Math.max(0, n - 1))}
            className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink/30"
          >
            Back
          </button>
        ) : (
          <a
            href="/app"
            className="rounded-full px-2 py-2.5 text-[13px] text-text-secondary transition-colors hover:text-ink"
          >
            Skip for now
          </a>
        )}

        {last ? (
          <button
            type="submit"
            disabled={submitting}
            className="ml-auto rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Finish"}
          </button>
        ) : (
          <button
            key={`next-${step}`}
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((n) => Math.min(STEPS.length - 1, n + 1))}
            className="ml-auto rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-700 disabled:opacity-40"
          >
            Continue
          </button>
        )}
      </div>
    </form>
  );
}
