export default function LiveLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading live sessions">
      <div className="space-y-2">
        <div className="h-3 w-12 rounded-full bg-surface" />
        <div className="h-8 w-72 max-w-full rounded-lg bg-surface" />
        <div className="h-4 w-80 max-w-full rounded-full bg-surface" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-white p-5 shadow-card">
            <div className="h-3 w-16 rounded-full bg-surface" />
            <div className="mt-3 h-6 w-10 rounded-lg bg-surface" />
          </div>
        ))}
      </div>

      <div className="h-36 rounded-2xl bg-ink/10" />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {[0, 1].map((col) => (
          <div key={col}>
            <div className="mb-3 h-4 w-24 rounded-full bg-surface" />
            <div className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-12 w-12 rounded-xl bg-surface" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-44 max-w-full rounded-full bg-surface" />
                    <div className="h-3 w-32 rounded-full bg-surface" />
                  </div>
                  <div className="h-7 w-14 rounded-full bg-surface" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
