import { PeopleDirectory } from "@/components/people/PeopleDirectory";

export const dynamic = "force-dynamic";

export default async function MembersDirectory(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  return <PeopleDirectory q={(searchParams.q || "").trim()} mode="all" />;
}
