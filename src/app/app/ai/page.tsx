import CoachChat from "./CoachChat";
import { AI_CONFIGURED } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default function AICoachPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-h3 font-bold">AI Career Coach</h1>
        <p className="text-small text-text-secondary mt-1">
          Personalized, grounded career guidance — available 24/7.
        </p>
      </div>

      {!AI_CONFIGURED && (
        <div className="mb-4 rounded-md border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-small text-[#92400e]">
          The coach isn&apos;t switched on yet. Add an <code>OPENAI_API_KEY</code> to your
          Vercel environment variables to enable live coaching. The chat still works as a demo and
          will explain this until the key is set.
        </div>
      )}

      <CoachChat />
    </div>
  );
}
