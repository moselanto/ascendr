import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import type { Community } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: communities } = await supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: myMemberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", profile!.id);
  const joined = new Set((myMemberships ?? []).map((m) => m.community_id));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-h3 font-bold">Communities</h1>
        <Link href="/app/communities/new" className="rounded-sm bg-primary px-4 py-2.5 text-small font-semibold text-white">
          + Create community
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(communities as Community[] | null)?.length ? (
          (communities as Community[]).map((c) => (
            <Link
              key={c.id}
              href={`/app/communities/${c.slug}`}
              className="rounded-md border border-border bg-card p-5 hover:shadow-sm transition"
            >
              <div className="h-20 -mx-5 -mt-5 mb-4 rounded-t-md bg-gradient-to-br from-primary to-accent" />
              <div className="font-bold text-h4">{c.name}</div>
              <p className="text-small text-text-secondary mt-1 line-clamp-2">
                {c.description || "A community on ASCENDR."}
              </p>
              <div className="mt-3 flex items-center justify-between text-caption text-text-secondary">
                <span>{c.member_count} members</span>
                {joined.has(c.id) ? (
                  <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 font-semibold text-[#047857]">Joined</span>
                ) : (
                  <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 font-semibold text-primary">Open</span>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="sm:col-span-2 rounded-md border border-dashed border-border bg-card p-10 text-center text-text-secondary">
            No communities yet.{" "}
            <Link href="/app/communities/new" className="text-primary font-semibold">Create the first one</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
