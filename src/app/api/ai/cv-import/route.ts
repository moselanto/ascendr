import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data";
import { consumeQuota, getTier, quotaExceededResponse } from "@/lib/usage";
import { AI_CONFIGURED } from "@/lib/ai";
import { analyzeCv, extractCvText, MAX_CV_BYTES } from "@/lib/career/cv";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/cv-import
 * multipart/form-data with either `file` (PDF or .txt, max 5 MB) or `text`.
 * Returns the CV analysis. Nothing is saved here; the member chooses what to
 * keep on the next screen. The CV text is never stored.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!AI_CONFIGURED) {
    return NextResponse.json({ error: "CV import needs the AI switched on. Add GROQ_API_KEY in Vercel." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Upload a file or paste your CV text." }, { status: 400 });
  }

  let text = String(form.get("text") ?? "").trim();
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CV_BYTES) {
      return NextResponse.json({ error: "That file is over 5 MB. Upload a smaller PDF." }, { status: 413 });
    }
    try {
      text = await extractCvText(file);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message || "Could not read that file." }, { status: 400 });
    }
  }
  if (text.length < 200) {
    return NextResponse.json(
      { error: "We could not find enough text. If your PDF is a scanned image, paste the text instead." },
      { status: 400 }
    );
  }

  const quota = await consumeQuota(profile.id, "ai:cv-import", await getTier(profile.id));
  if (!quota.allowed) return quotaExceededResponse(quota, "ai:cv-import");

  try {
    const analysis = await analyzeCv(profile.id, text);
    return NextResponse.json({ analysis });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "The AI could not read this CV." }, { status: 502 });
  }
}
