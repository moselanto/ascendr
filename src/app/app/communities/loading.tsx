export default function CommunitiesLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse" aria-busy="true" aria-label="Loading communities">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="h-3 w-24 rounded-full bg-surface" />
          <div className="mt-3 h-8 w-72 rounded-lg bg-surface" />
          <div className="mt-2 h-4 w-96 max-w-full rounded-full bg-surface" />
        </div>
        <div className="h-10 w-40 rounded-full bg-surface" />
      </div>

      <div className="mt-8">
        <div className="mb-3 h-4 w-36 rounded-full bg-surface" />
        <div className="divide-y divide-border rounded-2xl border border-border bg-white p-0 shadow-card">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-10 w-10 rounded-xl bg-surface" />
              <div className="flex-1">
                <div className="h-4 w-40 rounded-full bg-surface" />
                <div className="mt-2 h-3 w-64 max-w-full rounded-full bg-surface" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-3 h-4 w-24 rounded-full bg-surface" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
              <div className="h-10 w-10 rounded-xl bg-surface" />
              <div className="mt-4 h-4 w-32 rounded-full bg-surface" />
              <div className="mt-2 h-3 w-full rounded-full bg-surface" />
              <div className="mt-1.5 h-3 w-2/3 rounded-full bg-surface" />
              <div className="mt-4 h-3 w-20 rounded-full bg-surface" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
