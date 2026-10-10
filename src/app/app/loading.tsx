/**
 * Loading state for the authenticated product area.
 *
 * Mirrors the dashboard's card layout (rounded-2xl white cards on surface)
 * so the page does not reflow when real content arrives.
 */
function CardSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-white p-6 shadow-card ${className}`}>
      <div className="h-3 w-24 rounded-full bg-surface" />
      <div className="mt-4 h-5 w-2/3 rounded-full bg-surface" />
      <div className="mt-5 flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 rounded-full bg-surface" style={{ width: `${92 - i * 14}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function AppLoading() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <div className="relative h-36 overflow-hidden rounded-2xl bg-ink/90">
        <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
        <div className="relative p-6 md:p-8">
          <div className="h-3 w-28 rounded-full bg-white/15" />
          <div className="mt-4 h-6 w-1/2 rounded-full bg-white/15" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
        <div className="flex flex-col gap-6">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={4} />
        </div>
      </div>

      <span className="sr-only">Loading{"…"}</span>
    </div>
  );
}
