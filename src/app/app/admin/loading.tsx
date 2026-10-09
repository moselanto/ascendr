export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded-full bg-surface" />
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <div className="h-3 w-28 animate-pulse rounded-full bg-surface" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded-lg bg-surface" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded-full bg-surface" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading admin console</span>
    </div>
  );
}
