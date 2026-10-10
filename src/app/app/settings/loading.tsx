/** Loading skeleton for My profile: head, details form card, side summaries, privacy/account lists. */
export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      <div className="h-3 w-16 rounded-full bg-border" />
      <div className="mt-3 h-8 w-48 rounded-lg bg-border" />
      <div className="mt-2 h-4 w-80 max-w-full rounded-lg bg-surface" />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-brand-50" />
            <div className="flex-1">
              <div className="h-3 w-24 rounded-full bg-border" />
              <div className="mt-2 h-4 w-40 rounded-full bg-border" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="h-[62px] rounded-lg bg-surface" />
            <div className="h-[62px] rounded-lg bg-surface" />
          </div>
          <div className="mt-4 h-28 rounded-lg bg-surface" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="h-[62px] rounded-lg bg-surface" />
            <div className="h-[62px] rounded-lg bg-surface" />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="h-40 rounded-2xl border border-border bg-white shadow-card" />
          <div className="h-40 rounded-2xl border border-border bg-white shadow-card" />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-white shadow-card">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-b border-border px-5 py-4 last:border-b-0">
            <div className="h-3 w-32 rounded-full bg-border" />
            <div className="mt-2 h-3 w-64 max-w-full rounded-full bg-surface" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
