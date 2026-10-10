import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { createCommunity } from "../actions";

export const dynamic = "force-dynamic";

type HostedCommunity = { name: string; slug: string };

export default async function CreateHubPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  // Communities where the user can schedule live sessions (owner/moderator).
  let hosted: HostedCommunity[] = [];
  if (profile) {
    const { data: rows } = await supabase
      .from("community_members")
      .select("role, status, communities:community_id(name, slug)")
      .eq("user_id", profile.id)
      .in("role", ["owner", "moderator"]);
    hosted = (rows ?? [])
      .filter((r) => r.status === "active")
      .map((r) => {
        const c = Array.isArray(r.communities) ? r.communities[0] : r.communities;
        return c ? { name: String(c.name ?? "Community"), slug: String(c.slug ?? "") } : null;
      })
      .filter((c): c is HostedCommunity => !!c && !!c.slug);
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Page head */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Create</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            What will you <em className="accent-serif">start today?</em>
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Start a community, host a live session, or share something with your network.
          </p>
        </div>
        <Link
          href="/app/communities"
          className="self-start rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:border-ink/40 md:self-auto"
        >
          {"←"} All communities
        </Link>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Main card: create a community */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-card md:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">
              +
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-ink">Create a community</h2>
              <p className="mt-0.5 text-[14px] text-text-secondary">
                You become the owner. We set up #general and #introductions channels for you.
              </p>
            </div>
          </div>

          {searchParams.error && (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[14px] text-danger">
              {searchParams.error}
            </div>
          )}

          <form action={createCommunity} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-[12px] font-medium text-text-secondary">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="e.g. Leadership Lab"
                className="rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-[12px] font-medium text-text-secondary">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="What is this community about? Who is it for?"
                className="resize-none rounded-lg border border-border px-3 py-2.5 text-[14px] text-ink"
              />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <button className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-700">
                Create community
              </button>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-800">
                +25 XP
              </span>
            </div>
          </form>
        </div>

        {/* Secondary options */}
        <div className="flex flex-col gap-5">
          <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white">
            <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Live
              </div>
              <h2 className="mt-2 text-[17px] font-semibold">Schedule a live session</h2>
              <p className="mt-1 text-[14px] text-white/70">
                Host an AMA, workshop or office hours with Q&amp;A, polls and chat.
              </p>
              {hosted.length ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {hosted.slice(0, 5).map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/app/communities/${c.slug}/live`}
                        className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-[14px] font-medium text-white hover:bg-white/15"
                      >
                        <span className="truncate">{c.name}</span>
                        <span aria-hidden>{"→"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-[13px] text-white/60">
                  Live sessions are hosted inside a community you own or moderate. Create one first.
                </p>
              )}
            </div>
          </div>

          <Link
            href="/app/feed"
            className="rounded-2xl border border-border bg-white p-5 shadow-card transition hover:shadow-lift md:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold text-ink">
              {"✎"}
            </span>
            <h2 className="mt-4 text-[17px] font-semibold text-ink">Share a post</h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              Post a win, a question or a resource to your feed.
            </p>
            <span className="mt-4 inline-block text-[14px] font-medium text-ink">
              Go to feed {"→"}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
