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
export default async function MentorWorkspacePage({ params }: { params: { slug: string } }) {
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
    .select("id, title, status, created_at")
    .eq("community_id", community.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-h3 font-bold">Mentor Workspace</h1>
        <p className="mt-1 text-small text-text-secondary">
          Add your knowledge — frameworks, FAQs, playbooks, transcripts. ASCENDR turns it into your
          AI clone so members get grounded answers in your voice, with citations, even when you are away.
        </p>
      </div>
      <MentorWorkspace communityId={community.id} initialSources={sources ?? []} />
      <div className="mt-6">
        <Link href={`/app/communities/${community.slug}`} className="text-small text-primary font-semibold">
          ← Back to {community.name}
        </Link>
      </div>
    </div>
  );
}
