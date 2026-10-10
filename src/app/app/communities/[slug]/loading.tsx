export default function CommunityLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="Loading community">
      <div className="h-3 w-28 rounded-full bg-surface" />

      <div className="mt-3 rounded-2xl border border-border bg-white shadow-card">
        <div className="flex items-start gap-4 p-5 md:p-6">
          <div className="h-12 w-12 rounded-xl bg-surface" />
          <div className="flex-1">
            <div className="h-3 w-20 rounded-full bg-surface" />
            <div className="mt-3 h-8 w-64 max-w-full rounded-lg bg-surface" />
            <div className="mt-2 h-4 w-96 max-w-full rounded-full bg-surface" />
            <div className="mt-3 flex gap-2">
              <div className="h-6 w-24 rounded-full bg-surface" />
              <div className="h-6 w-20 rounded-full bg-surface" />
            </div>
          </div>
          <div className="hidden h-10 w-32 rounded-full bg-surface md:block" />
        </div>
        <div className="flex gap-4 border-t border-border px-4 py-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-20 rounded-full bg-surface" />
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col gap-2">
          <div className="mb-1 h-3 w-20 rounded-full bg-surface" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-surface" />
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-white shadow-card">
          <div className="border-b border-border px-5 py-4">
            <div className="h-4 w-32 rounded-full bg-surface" />
          </div>
          <div className="flex flex-col gap-5 px-5 py-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-surface" />
                <div className="flex-1">
                  <div className="h-3 w-32 rounded-full bg-surface" />
                  <div className="mt-2 h-3 w-3/4 rounded-full bg-surface" />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <div className="h-10 rounded-lg bg-surface" />
          </div>
        </div>
      </div>
    </div>
  );
}
