import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import CvImport from "./CvImport";

export const dynamic = "force-dynamic";

export default async function CvImportPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/app/career/import");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/career" className="text-[13px] font-medium text-text-secondary hover:text-ink">
        {"←"} Career intelligence
      </Link>
      <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-ink">Import your CV or LinkedIn</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
        We read your CV, find the skills it shows, match you to the roles you are closest to, and point out
        what would make you stronger. You choose what to save. Your CV file and text are not stored.
      </p>
      <div className="mt-6">
        <CvImport />
      </div>
    </div>
  );
}
