/**
 * Root loading state.
 *
 * A quiet skeleton rather than a spinner: it holds the page's shape while
 * data resolves, so the layout does not jump when content arrives.
 */
export default function Loading() {
  return (
    <main className="min-h-screen bg-surface px-5 py-20" aria-busy="true">
      <div className="mx-auto max-w-3xl animate-pulse text-center">
        <div className="mx-auto h-3 w-32 rounded-full bg-border" />
        <div className="mx-auto mt-6 h-10 w-full max-w-xl rounded-full bg-border" />
        <div className="mx-auto mt-3 h-10 w-4/5 max-w-lg rounded-full bg-border" />
        <div className="mx-auto mt-8 h-3 w-2/3 rounded-full bg-border" />
        <div className="mx-auto mt-3 h-3 w-1/2 rounded-full bg-border" />
        <div className="mt-10 flex justify-center gap-3">
          <div className="h-10 w-36 rounded-full bg-border" />
          <div className="h-10 w-32 rounded-full bg-border" />
        </div>
      </div>
      <span className="sr-only">Loading{"…"}</span>
    </main>
  );
}
