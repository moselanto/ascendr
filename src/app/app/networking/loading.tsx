/** Loading skeleton for Network: head, request/connection lists and the messages pane. */
export default function NetworkingLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="h-3 w-16 rounded-full bg-border" />
      <div className="mt-3 h-8 w-72 rounded-lg bg-border" />
      <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-surface" />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          {[3, 4].map((rows, s) => (
            <div key={s}>
              <div className="mb-2 h-3 w-36 rounded-full bg-border" />
              <div className="rounded-2xl border border-border bg-white shadow-card">
                {Array.from({ length: rows }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0">
                    <div className="h-10 w-10 rounded-full bg-brand-50" />
                    <div className="flex-1">
                      <div className="h-3 w-32 rounded-full bg-border" />
                      <div className="mt-2 h-3 w-20 rounded-full bg-surface" />
                    </div>
                    <div className="h-7 w-20 rounded-full bg-surface" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="h-72 rounded-2xl border border-border bg-white shadow-card" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
