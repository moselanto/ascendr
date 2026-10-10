import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { MentorWorkspace } from "@/components/mentor/MentorWorkspace";

export const dynamic = "force-dynamic";

/**
 * Mentor Workspace — owner/moderator only.
 * Add content sources (paste text) that power this community's Mentor Clone.
 */
export default async function MentorWorkspacePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!community) notFound();

  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", community.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  const isMentor = membership && ["owner", "moderator"].includes(membership.role);
  if (!isMentor) redirect(`/app/communities/${community.slug}`);

  const { data: sources } = await supabase
    .from("ai_sources")
    .select("*")
    .eq("community_id", community.id)
    .order("created_at", { ascending: false });

  const sourceCount = (sources ?? []).length;
  const readyCount = (sources ?? []).filter((s) => s.status === "ready").length;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/app/communities/${community.slug}`}
        className="text-[13px] font-medium text-text-secondary hover:text-ink"
      >
        {"←"} {community.name}
      </Link>

      {/* Page head */}
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Mentor workspace</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">
            Train your <em className="accent-serif">AI clone</em>
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] text-text-secondary">
            Add frameworks, FAQs, playbooks and transcripts. Members get grounded answers in your voice, with
            citations, even when you are away.
          </p>
        </div>
      </div>

      {/* Feature panel */}
      <div className="relative mt-6 overflow-hidden rounded-2xl bg-ink p-6 text-white">
        <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
        <div className="relative flex flex-wrap items-center gap-8">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">Sources</div>
            <div className="mt-1 text-[28px] font-semibold">{sourceCount}</div>
          </div>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">Ready</div>
            <div className="mt-1 flex items-center gap-2 text-[28px] font-semibold">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {readyCount}
            </div>
          </div>
          <p className="max-w-sm text-[14px] text-white/70">
            The more specific your sources, the better your clone answers. Members can always escalate to you.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <MentorWorkspace communityId={community.id} initialSources={sources ?? []} />
      </div>
    </div>
  );
}
