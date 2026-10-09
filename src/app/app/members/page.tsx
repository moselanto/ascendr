import { PeopleDirectory } from "@/components/people/PeopleDirectory";

export const dynamic = "force-dynamic";

export default async function MembersDirectory({ searchParams }: { searchParams: { q?: string } }) {
  return <PeopleDirectory q={(searchParams.q || "").trim()} mode="all" />;
}
