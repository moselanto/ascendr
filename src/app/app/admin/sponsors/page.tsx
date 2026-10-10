import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { tryAdminClient } from "../_lib/admin-client";
import { AdminClientError, PageHead } from "../_components/ui";

export const dynamic = "force-dynamic";

/**
 * Sponsor codes (migration 0024). A sponsor pays for N seats; each member who
 * redeems the code gets Plus for the code's number of months.
 */

function makeCode(sponsor: string) {
  const prefix = sponsor.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "ASCENDR";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  const tail = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${prefix}-${tail}`;
}

async function createSponsorCode(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();
  const sponsor = String(formData.get("sponsor") ?? "").trim().slice(0, 120);
  const seats = Math.max(1, Math.min(100000, Number(formData.get("seats") ?? 0) || 0));
  const months = Math.max(1, Math.min(24, Number(formData.get("months") ?? 3) || 3));
  const days = Number(formData.get("expires_days") ?? 0) || 0;
  if (sponsor.length < 2) return;
  const admin = tryAdminClient();
  if (admin == null) return;
  const { error } = await admin.from("sponsor_codes").insert({
    code: makeCode(sponsor),
    sponsor_name: sponsor,
    seats,
    months,
    expires_at: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
    created_by: profile.id,
  });
  revalidatePath("/app/admin/sponsors");
  redirect(`/app/admin/sponsors?toast=${encodeURIComponent(error ? `Could not create the code: ${error.message}` : "Sponsor code created")}`);
}

type Code = { code: string; sponsor_name: string; seats: number; used: number; months: number; expires_at: string | null; created_at: string };

export default async function AdminSponsorsPage() {
  const admin = tryAdminClient();
  if (admin == null) {
    return (
      <div className="space-y-6">
        <PageHead title="Sponsor codes" />
        <AdminClientError />
      </div>
    );
  }
  const { data, error } = await admin
    .from("sponsor_codes")
    .select("code, sponsor_name, seats, used, months, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const codes = (data ?? []) as Code[];
  const seats = codes.reduce((n, c) => n + c.seats, 0);
  const used = codes.reduce((n, c) => n + c.used, 0);

  return (
    <div className="space-y-6">
      <PageHead title="Sponsor codes" description="A sponsor pays for a number of seats. Each member who redeems the code gets Plus for the months you set." />
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[13px] text-amber-900">
          Run <code className="rounded bg-white/70 px-1.5 py-0.5">supabase/migrations/0024_sponsor_codes.sql</code> in Supabase to enable sponsor codes.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Codes", value: String(codes.length) },
          { label: "Seats sold", value: seats.toLocaleString("en-US") },
          { label: "Seats redeemed", value: `${used.toLocaleString("en-US")}${seats > 0 ? ` (${Math.round((used / seats) * 100)}%)` : ""}` },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-[12px] text-text-secondary">{k.label}</p>
            <p className="nums mt-1 text-[24px] font-semibold tracking-tight text-ink">{k.value}</p>
          </div>
        ))}
      </div>

      <form action={createSponsorCode} className="grid gap-3 rounded-2xl border border-border bg-white p-5 shadow-card sm:grid-cols-[1.6fr_0.7fr_0.7fr_0.8fr_auto] sm:items-end">
        <label className="text-[12px] font-medium text-text-secondary">
          Sponsor
          <input name="sponsor" required minLength={2} maxLength={120} placeholder="e.g. Acme Foundation" className="mt-1 block w-full rounded-xl border border-border px-3 py-2 text-[14px] text-ink" />
        </label>
        <label className="text-[12px] font-medium text-text-secondary">
          Seats
          <input name="seats" type="number" min={1} max={100000} defaultValue={50} className="mt-1 block w-full rounded-xl border border-border px-3 py-2 text-[14px] text-ink" />
        </label>
        <label className="text-[12px] font-medium text-text-secondary">
          Months of Plus
          <input name="months" type="number" min={1} max={24} defaultValue={3} className="mt-1 block w-full rounded-xl border border-border px-3 py-2 text-[14px] text-ink" />
        </label>
        <label className="text-[12px] font-medium text-text-secondary">
          Expires in (days)
          <input name="expires_days" type="number" min={0} max={730} defaultValue={90} className="mt-1 block w-full rounded-xl border border-border px-3 py-2 text-[14px] text-ink" />
        </label>
        <button className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">Create code</button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        {codes.length === 0 ? (
          <p className="px-6 py-10 text-center text-[14px] text-text-secondary">No sponsor codes yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {codes.map((c) => {
              const expired = c.expires_at != null && new Date(c.expires_at).getTime() < Date.now();
              return (
                <li key={c.code} className="flex flex-wrap items-center gap-3 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[14px] font-semibold tracking-wide text-ink">{c.code}</p>
                    <p className="text-[12px] text-text-secondary">
                      {c.sponsor_name} · {c.months} month{c.months === 1 ? "" : "s"} of Plus
                      {c.expires_at ? ` · ${expired ? "expired" : "expires"} ${new Date(c.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                    </p>
                  </div>
                  <div className="w-40">
                    <div className="h-1.5 rounded-full bg-surface">
                      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.min(100, Math.round((c.used / c.seats) * 100))}%` }} />
                    </div>
                    <p className="nums mt-1 text-right text-[12px] text-text-secondary">
                      {c.used} of {c.seats} seats used
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
