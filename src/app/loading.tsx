/**
 * Root loading state.
 *
 * A skeleton rather than a spinner: it holds the page's shape while data
 * resolves, so the layout does not jump when content arrives.
 */
export default function Loading() {
  return (
    <main className="min-h-screen bg-bg px-6 py-20">
      <div className="mx-auto max-w-3xl animate-pulse text-center">
        <div className="mx-auto h-6 w-40 rounded-full bg-border" />
        <div className="mx-auto mt-6 h-12 w-full rounded-md bg-border" />
        <div className="mx-auto mt-3 h-12 w-4/5 rounded-md bg-border" />
        <div className="mx-auto mt-8 h-4 w-2/3 rounded-sm bg-border" />
        <div className="mx-auto mt-3 h-4 w-1/2 rounded-sm bg-border" />

        <div className="mt-10 flex justify-center gap-3">
          <div className="h-12 w-48 rounded-sm bg-border" />
          <div className="h-12 w-40 rounded-sm bg-border" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </main>
  );
}
