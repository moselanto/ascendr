export default function FeedLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading feed">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-surface" />
        <div className="h-8 w-72 max-w-full rounded-lg bg-surface" />
        <div className="h-4 w-80 max-w-full rounded-full bg-surface" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-surface" />
              <div className="h-24 flex-1 rounded-lg bg-surface" />
            </div>
            <div className="mt-3 flex justify-end">
              <div className="h-10 w-20 rounded-full bg-surface" />
            </div>
          </div>

          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface" />
                <div className="space-y-2">
                  <div className="h-3.5 w-32 rounded-full bg-surface" />
                  <div className="h-3 w-16 rounded-full bg-surface" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3.5 w-full rounded-full bg-surface" />
                <div className="h-3.5 w-4/5 rounded-full bg-surface" />
              </div>
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="h-7 w-16 rounded-full bg-surface" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="h-40 rounded-2xl bg-ink/10" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-border bg-white shadow-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
