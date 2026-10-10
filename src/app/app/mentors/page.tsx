import { PeopleDirectory } from "@/components/people/PeopleDirectory";

export const dynamic = "force-dynamic";

export default async function MentorsPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  return <PeopleDirectory q={(searchParams.q || "").trim()} mode="mentors" />;
}
