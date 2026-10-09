/**
 * Shared loading skeleton for app pages. Matches the page-head + card
 * layout so content does not jump when it arrives.
 */
function Bar({ w, h = "h-3", tone = "bg-surface" }: { w: string; h?: string; tone?: string }) {
  return <div className={`${h} rounded-full ${tone}`} style={{ width: w }} />;
}

function Card({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
      <Bar w="30%" />
      <div className="mt-4">
        <Bar w="65%" h="h-5" />
      </div>
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} w={`${90 - i * 14}%`} />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = "split" }: { variant?: "split" | "grid" | "list" }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Bar w="110px" />
        <Bar w="45%" h="h-7" tone="bg-border" />
        <Bar w="35%" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <Bar w="50%" />
            <div className="mt-3">
              <Bar w="35%" h="h-7" tone="bg-border" />
            </div>
          </div>
        ))}
      </div>
      {variant === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} lines={2} />
          ))}
        </div>
      ) : variant === "list" ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} lines={1} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card lines={5} />
          <Card lines={4} />
        </div>
      )}
    </div>
  );
}
