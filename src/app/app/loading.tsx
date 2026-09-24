/**
 * Loading state for the authenticated product area.
 *
 * Mirrors the dashboard's card layout so the page does not reflow when real
 * content arrives.
 */
export default function AppLoading() {
  return (
    <div className="animate-pulse p-1">
      <div className="h-20 rounded-md bg-border" />

      <div className="mt-4 grid gap-4 md:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="h-32 rounded-md bg-border" />
          <div className="h-32 rounded-md bg-border" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-24 rounded-md bg-border" />
          <div className="h-40 rounded-md bg-border" />
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
