"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string | null; status: string; created_at: string };

/**
 * Add or remove an authenticator app (Google Authenticator, Microsoft
 * Authenticator, 1Password, Authy...). Uses Supabase Auth TOTP factors.
 */
export function MfaSetup({ required = false }: { required?: boolean }) {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(((data?.totp ?? []) as Factor[]).filter((f) => f.status === "verified"));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function start() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    // Clear any half-finished setup first, so a retry never hits a name clash.
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of (all?.all ?? []) as Factor[]) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || data == null) {
      setMsg({ kind: "err", text: error?.message ?? "Could not start setup. Check that MFA is enabled in Supabase." });
      return;
    }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (enroll == null) return;
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: "That code didn't match. Check the time on your phone and try the newest code." });
      return;
    }
    setEnroll(null);
    setCode("");
    setMsg({ kind: "ok", text: "Two-factor sign-in is on." });
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: "Sign in with your authenticator code first, then remove it." });
      return;
    }
    await load();
    router.refresh();
  }

  const on = factors.length > 0;

  return (
    <section id="security" className="scroll-mt-24 rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Security</p>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">Two-factor sign-in</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-text-secondary">
            After your password, enter a 6-digit code from an authenticator app on your phone.
            {required ? " Admin accounts must turn this on before using the admin console." : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${on ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          {loading ? "Checking" : on ? "On" : "Off"}
        </span>
      </div>

      {msg ? <p className={`mt-3 text-[13px] ${msg.kind === "ok" ? "text-emerald-800" : "text-danger"}`}>{msg.text}</p> : null}

      {on && enroll == null ? (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
          {factors.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
              <span className="text-ink">{f.friendly_name || "Authenticator app"}</span>
              <button type="button" disabled={busy} onClick={() => remove(f.id)} className="text-[12px] text-text-secondary hover:text-danger disabled:opacity-50">
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {on === false && enroll == null && loading === false ? (
        <button type="button" disabled={busy} onClick={start} className="mt-4 rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50">
          Turn on two-factor sign-in
        </button>
      ) : null}

      {enroll ? (
        <form onSubmit={confirm} className="mt-4 grid gap-4 md:grid-cols-[180px_1fr] md:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-xl border border-border bg-white p-2" />
          <div>
            <ol className="list-decimal space-y-1 pl-4 text-[13px] text-text-secondary">
              <li>Open your authenticator app and scan the QR code.</li>
              <li>
                Can&apos;t scan? Enter this key: <code className="break-all rounded bg-surface px-1.5 py-0.5 text-ink">{enroll.secret}</code>
              </li>
              <li>Type the 6-digit code it shows.</li>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-36 rounded-xl border border-border px-3 py-2.5 text-center text-[16px] tracking-[0.3em] text-ink outline-none focus:border-ink/40"
              />
              <button disabled={busy || code.length !== 6} className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700 disabled:opacity-50">
                Confirm
              </button>
              <button type="button" onClick={() => setEnroll(null)} className="rounded-full px-3 py-2.5 text-[13px] text-text-secondary hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}
