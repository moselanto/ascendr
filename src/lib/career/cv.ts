import { createClient } from "@/lib/supabase/server";
import { runChat } from "@/lib/ai";

/**
 * CV / LinkedIn import.
 *
 * 1. Pull plain text out of an uploaded PDF (a CV, or LinkedIn's "Save to PDF").
 * 2. Ask the model which catalogue skills the CV shows evidence for. It picks
 *    from a numbered list of real catalogue skills, so every match maps to a
 *    skill the gap analysis understands, and it must quote the evidence.
 * 3. Score every catalogue role against those skills in code (no model), so
 *    the role matches are deterministic and auditable.
 *
 * The CV text itself is never stored.
 */

export const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_CV_CHARS = 12000;

export async function extractCvText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    return clean(Array.isArray(text) ? text.join("\n") : text);
  }
  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
    return clean(await file.text());
  }
  throw new Error("Upload a PDF (or a .txt file). For Word documents, save as PDF first.");
}

function clean(t: string): string {
  return t.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CV_CHARS);
}

type CatalogueSkill = { id: string; label: string };
type RoleReq = { role_id: string; skill_id: string; importance: string; weight: number | null };

export type RoleMatch = {
  roleId: string;
  title: string;
  coverage: number; // 0..100, essential skills held
  essentialHeld: number;
  essentialTotal: number;
  missing: { skillId: string; label: string }[];
};

export type CvAnalysis = {
  currentTitle: string | null;
  yearsExperience: number | null;
  summary: string | null;
  skills: { skillId: string; label: string; evidence: string; alreadyHeld: boolean }[];
  otherSkills: string[];
  strengths: string[];
  improvements: string[];
  roles: RoleMatch[];
};

/** Catalogue skills used by at least one role, plus every role's requirements. */
async function loadCatalogue() {
  const supabase = await createClient();
  const { data: roleRows } = await supabase.from("role_profiles").select("id, title").order("title");
  const roles = (roleRows ?? []) as { id: string; title: string }[];
  // Per role, to stay under the API's 1,000-row cap.
  const lists = await Promise.all(
    roles.map((r) =>
      supabase
        .from("role_required_skills")
        .select("role_id, skill_id, importance, weight, skills(preferred_label)")
        .eq("role_id", r.id)
    )
  );
  const reqs: RoleReq[] = [];
  const skillMap = new Map<string, string>();
  for (const res of lists) {
    for (const row of (res.data ?? []) as unknown as (RoleReq & { skills: { preferred_label: string } | { preferred_label: string }[] | null })[]) {
      reqs.push({ role_id: row.role_id, skill_id: row.skill_id, importance: row.importance, weight: row.weight });
      const s = Array.isArray(row.skills) ? row.skills[0] : row.skills;
      if (s?.preferred_label) skillMap.set(row.skill_id, s.preferred_label);
    }
  }
  const skills: CatalogueSkill[] = Array.from(skillMap, ([id, label]) => ({ id, label })).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  return { roles, reqs, skills, skillMap };
}

export function scoreRoles(
  roles: { id: string; title: string }[],
  reqs: RoleReq[],
  held: Set<string>,
  labels: Map<string, string>
): RoleMatch[] {
  return roles
    .map((r) => {
      const ess = reqs.filter((q) => q.role_id === r.id && q.importance === "essential");
      const have = ess.filter((q) => held.has(q.skill_id));
      const missing = ess
        .filter((q) => !held.has(q.skill_id))
        .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
        .slice(0, 5)
        .map((q) => ({ skillId: q.skill_id, label: labels.get(q.skill_id) ?? "Skill" }));
      return {
        roleId: r.id,
        title: r.title,
        essentialHeld: have.length,
        essentialTotal: ess.length,
        coverage: ess.length ? Math.round((have.length / ess.length) * 100) : 0,
        missing,
      };
    })
    .filter((m) => m.essentialTotal > 0)
    .sort((a, b) => b.coverage - a.coverage || b.essentialHeld - a.essentialHeld)
    .slice(0, 3);
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const strList = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max);

export async function analyzeCv(profileId: string, cvText: string): Promise<CvAnalysis> {
  const supabase = await createClient();
  const [{ roles, reqs, skills, skillMap }, { data: mine }] = await Promise.all([
    loadCatalogue(),
    supabase.from("user_skills").select("skill_id").eq("user_id", profileId),
  ]);
  const alreadyHeld = new Set(((mine ?? []) as { skill_id: string }[]).map((r) => r.skill_id));

  const numbered = skills.map((s, i) => `${i + 1}. ${s.label}`).join("\n");
  const raw = await runChat(
    [
      {
        role: "system",
        content:
          "You read CVs and LinkedIn profile exports for ASCENDR, a career platform. " +
          "Use ONLY facts written in the CV. Never invent employers, titles, numbers or skills. " +
          "Respond ONLY with JSON of this shape: " +
          '{"current_title": string|null, "years_experience": number|null, "summary": string (2 sentences, plain), ' +
          '"skills": [{"n": number (from the numbered catalogue), "evidence": string (short quote or paraphrase from the CV)}], ' +
          '"other_skills": string[] (skills in the CV that are not in the catalogue, max 10), ' +
          '"strengths": string[] (2-4, each grounded in the CV), ' +
          '"improvements": string[] (3-5 specific ways to make this CV stronger, e.g. missing results, vague bullets, missing sections)}. ' +
          "Only pick a catalogue skill when the CV clearly shows it. Pick at most 30.",
      },
      {
        role: "user",
        content: `Skill catalogue:\n${numbered}\n\nCV:\n${cvText}`,
      },
    ],
    { maxTokens: 1800, temperature: 0.2, json: true }
  );

  const p = parseJson(raw);
  if (!p) throw new Error(raw.startsWith("The AI") || raw.startsWith("I couldn") ? raw : "The AI could not read this CV. Try again, or paste the text instead.");

  const seen = new Set<string>();
  const picked: CvAnalysis["skills"] = [];
  for (const item of Array.isArray(p.skills) ? p.skills : []) {
    const n = Number((item as { n?: unknown })?.n);
    const s = Number.isInteger(n) ? skills[n - 1] : undefined;
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    picked.push({
      skillId: s.id,
      label: s.label,
      evidence: String((item as { evidence?: unknown }).evidence ?? "").slice(0, 200),
      alreadyHeld: alreadyHeld.has(s.id),
    });
    if (picked.length >= 30) break;
  }

  const held = new Set<string>([...alreadyHeld, ...picked.map((s) => s.skillId)]);
  const years = Number(p.years_experience);
  return {
    currentTitle: typeof p.current_title === "string" && p.current_title.trim() ? p.current_title.trim().slice(0, 120) : null,
    yearsExperience: Number.isFinite(years) && years >= 0 && years < 60 ? Math.round(years) : null,
    summary: typeof p.summary === "string" ? p.summary.slice(0, 500) : null,
    skills: picked,
    otherSkills: strList(p.other_skills, 10),
    strengths: strList(p.strengths, 4),
    improvements: strList(p.improvements, 5),
    roles: scoreRoles(roles, reqs, held, skillMap),
  };
}
