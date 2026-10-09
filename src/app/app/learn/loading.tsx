export default function LearnLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading learning paths">
      <div className="space-y-2">
        <div className="h-3 w-16 rounded-full bg-surface" />
        <div className="h-8 w-80 max-w-full rounded-lg bg-surface" />
        <div className="h-4 w-96 max-w-full rounded-full bg-surface" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-52 rounded-2xl bg-ink/10" />
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-border bg-white p-5 shadow-card">
              <div className="h-3 w-20 rounded-full bg-surface" />
              <div className="mt-3 h-6 w-10 rounded-lg bg-surface" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 h-4 w-32 rounded-full bg-surface" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
              <div className="h-5 w-28 rounded-full bg-surface" />
              <div className="mt-4 h-4 w-44 rounded-full bg-surface" />
              <div className="mt-2 h-3 w-32 rounded-full bg-surface" />
              <div className="mt-5 h-1.5 w-full rounded-full bg-surface" />
              <div className="mt-5 h-7 w-24 rounded-full bg-surface" />
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <div className="h-10 w-10 rounded-full bg-surface" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-48 max-w-full rounded-full bg-surface" />
              <div className="h-3 w-28 rounded-full bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
