"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Second step of sign-in: enter the 6-digit authenticator code. */
export function MfaChallenge({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = (data?.totp ?? []).find((f) => f.status === "verified");
    if (factor == null) {
      setBusy(false);
      setErr("No authenticator is set up on this account.");
      return;
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (error) {
      setBusy(false);
      setErr("That code didn't match. Try the newest code in your app.");
      return;
    }
    window.location.assign(next);
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="123456"
        className="w-full rounded-xl border border-border px-3 py-3 text-center text-[20px] tracking-[0.4em] text-ink outline-none focus:border-ink/40"
      />
      {err ? <p className="text-[13px] text-danger">{err}</p> : null}
      <button disabled={busy || code.length !== 6} className="w-full rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50">
        {busy ? "Checking" : "Verify"}
      </button>
    </form>
  );
}
