/** Loading skeleton for AI Studio: page head, tabs, coach picker + chat card. */
export default function AIStudioLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="h-3 w-20 rounded-full bg-border" />
      <div className="mt-3 h-8 w-72 rounded-lg bg-border" />
      <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-surface" />

      <div className="mt-6 h-11 w-full max-w-md rounded-full border border-border bg-white" />

      <div className="mt-5 grid gap-5 md:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-white p-0 shadow-card">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0">
                <div className="h-10 w-10 rounded-full bg-brand-50" />
                <div className="flex-1">
                  <div className="h-3 w-28 rounded-full bg-border" />
                  <div className="mt-2 h-3 w-20 rounded-full bg-surface" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-28 rounded-2xl border border-dashed border-border bg-white" />
        </div>
        <div className="flex h-[70vh] min-h-[480px] flex-col rounded-2xl border border-border bg-surface shadow-card">
          <div className="h-[72px] rounded-t-2xl border-b border-border bg-white" />
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="h-16 w-2/3 rounded-2xl bg-white" />
            <div className="h-10 w-1/2 self-end rounded-2xl bg-border" />
            <div className="h-20 w-3/4 rounded-2xl bg-white" />
          </div>
          <div className="h-[66px] rounded-b-2xl border-t border-border bg-white" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
