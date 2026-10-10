import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/home/Logo";
import OnboardingFlow from "./OnboardingFlow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/onboarding");

  // Supported target roles. Falls back to free text in the flow when the
  // role catalogue has not been seeded yet.
  const supabase = await createClient();
  const { data: roleRows } = await supabase.from("role_profiles").select("id, title").order("title").limit(200);
  const roles = Array.from(
    new Set(((roleRows ?? []) as { id: string; title: string }[]).map((r) => r.title).filter(Boolean))
  );

  const firstName = (profile!.full_name ?? "").trim().split(" ")[0] || null;

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col px-5 py-8">
        <Logo />
        <div className="flex flex-1 items-center py-10">
          <OnboardingFlow roles={roles} firstName={firstName} />
        </div>
      </div>
    </main>
  );
}
