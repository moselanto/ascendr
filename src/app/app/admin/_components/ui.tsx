import type { ReactNode } from "react";

/**
 * Shared, server-safe presentational pieces for the platform admin console.
 * No hooks and no client-only APIs, so these render inside Server Components.
 */

export function PageHead({ title, description }: { title: string; description?: string }) {
  return (
    <header>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Admin</p>
      <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">{title}</h1>
      {description ? <p className="mt-2 max-w-2xl text-[14px] text-text-secondary">{description}</p> : null}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-white p-5 shadow-card ${className}`}>{children}</div>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-ink">{children}</h2>
      {aside ? <div className="text-[12px] text-text-secondary">{aside}</div> : null}
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card>
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className="nums mt-2 text-[28px] font-semibold leading-none text-ink">{value}</p>
      {hint ? <p className="mt-2 text-[12px] text-text-secondary">{hint}</p> : null}
    </Card>
  );
}

export type ChipTone = "brand" | "emerald" | "amber" | "neutral";

const CHIP_TONES: Record<ChipTone, string> = {
  brand: "bg-brand-50 text-brand-700",
  emerald: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  neutral: "bg-surface text-text-secondary",
};

export function Chip({ tone = "brand", children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${CHIP_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-md text-[13px] text-text-secondary">{body}</p> : null}
    </div>
  );
}

export function MigrationNotice() {
  return (
    <EmptyState
      title="Run migration 0013"
      body="The organisation tables (organizations, organization_members, organization_roles) are not available yet. Apply supabase/migrations/0013_networks.sql in the Supabase SQL editor."
    />
  );
}

export function AdminClientError() {
  return (
    <EmptyState
      title="Could not connect with the service-role client"
      body="Check that SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are set in Vercel."
    />
  );
}

export function QueryError({ what, message }: { what: string; message?: string }) {
  return (
    <EmptyState title={`Could not load ${what}`} body={message ? message : "The query failed. Try again shortly."} />
  );
}

/** Table header cell styling, shared by every admin table. */
export const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary";
/** Table body cell styling. */
export const TD = "px-4 py-3 align-middle text-[13px] text-ink";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("en-GB");
}

const ORG_KIND_LABELS: Record<string, string> = {
  vc_fund: "VC fund",
  accelerator: "Accelerator",
  university: "University",
  association: "Association",
  company: "Company",
  other: "Other",
};

export function orgKindLabel(kind: string | null | undefined): string {
  if (!kind) return "Other";
  return ORG_KIND_LABELS[kind] ?? kind;
}

export function displayName(p: { full_name?: string | null; handle?: string | null } | null | undefined): string {
  if (!p) return "Unknown";
  return p.full_name?.trim() || (p.handle ? `@${p.handle}` : "Unnamed member");
}
