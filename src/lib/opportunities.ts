// Opportunity Intelligence — live roles from public company job boards.
//
// Sources are the keyless public JSON feeds that Greenhouse, Lever and Ashby
// publish for every company on them. No scraping, no API keys, no terms-of-use
// grey area: these endpoints exist precisely so jobs can be syndicated.
//
// Feeds are fetched server-side and cached for an hour via Next's fetch cache,
// so a page view does not hit six job boards. Boards above ~1MB (Palantir,
// Ramp, OpenAI) are deliberately excluded: they would blow the 2MB fetch-cache
// limit and slow every uncached render. Add boards by appending to SOURCES.
//
// Honesty: matching is on job TITLE only. The list feeds do not include
// descriptions (fetching them per job would be hundreds of requests), so we do
// not claim per-job skill fit. The page shows the member's overall fit band
// for the role type instead, and says so.

export type Opportunity = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  source: "greenhouse" | "lever" | "ashby";
  seniority: "senior" | "standard";
};

type Source = { ats: Opportunity["source"]; board: string; company: string };

const SOURCES: Source[] = [
  { ats: "greenhouse", board: "stripe", company: "Stripe" },
  { ats: "greenhouse", board: "gitlab", company: "GitLab" },
  { ats: "greenhouse", board: "airbnb", company: "Airbnb" },
  { ats: "greenhouse", board: "figma", company: "Figma" },
  { ats: "lever", board: "spotify", company: "Spotify" },
  { ats: "ashby", board: "linear", company: "Linear" },
];

// Title patterns per ESCO role title (lower-case). ESCO alt titles are too
// noisy to match job titles directly ("sports product engineer" is an alt for
// product manager), so each supported role gets a hand-written pattern.
const ROLE_PATTERNS: Record<string, RegExp> = {
  "product manager": /\bproduct (manager|lead|owner)\b/i,
  "data analyst": /\b(data analyst|analytics (analyst|engineer)|business intelligence analyst)\b/i,
  "data scientist": /\b(data scien(ce|tist)|machine learning scientist|applied scientist)\b/i,
  "software developer": /\b(software|backend|back-end|frontend|front-end|full[- ]?stack|web|mobile|ios|android) (engineer|developer)\b/i,
  "business analyst": /\bbusiness (systems )?analyst\b/i,
  "user interface designer": /\b(product|ux|ui|interaction|visual) designer\b/i,
  "project manager": /\b(technical )?(project|program|programme) manager\b/i,
  "marketing manager": /\b(marketing manager|product marketing|growth marketing)\b/i,
  "sales manager": /\b(sales manager|account executive|sales lead|account manager)\b/i,
  "operations manager": /\b(operations manager|business operations|bizops)\b/i,
  "ict help desk agent": /\b(support (engineer|specialist|agent)|help ?desk|technical support|it support)\b/i,
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function patternForRole(roleTitle: string): RegExp {
  const key = roleTitle.trim().toLowerCase();
  return ROLE_PATTERNS[key] ?? new RegExp(`\\b${escapeRegExp(key)}\\b`, "i");
}

const SENIOR = /\b(senior|sr\.?|staff|principal|lead|head of|director|vp)\b/i;
const REMOTE = /\bremote\b/i;

async function getJson(url: string): Promise<unknown> {
  try {
    // Cap each board at 4s: one slow job board used to hold the whole
    // Opportunities page on its loading screen for 20+ seconds.
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
      headers: { Accept: "application/json", "User-Agent": "ASCENDR/1.0 (+https://ascendr-two.vercel.app)" },
    });
    if (res.ok === false) return null;
    return await res.json();
  } catch {
    // One board being down must never take the page down.
    return null;
  }
}

async function fetchSource(s: Source): Promise<Opportunity[]> {
  if (s.ats === "greenhouse") {
    const data = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${s.board}/jobs`)) as
      | { jobs?: { id: number; title: string; absolute_url: string; location?: { name?: string } }[] }
      | null;
    return (data?.jobs ?? []).map((j) => {
      const location = j.location?.name ?? "";
      return {
        id: `gh-${s.board}-${j.id}`,
        title: j.title,
        company: s.company,
        location,
        remote: REMOTE.test(location),
        url: j.absolute_url,
        source: "greenhouse" as const,
        seniority: SENIOR.test(j.title) ? ("senior" as const) : ("standard" as const),
      };
    });
  }

  if (s.ats === "lever") {
    const data = (await getJson(`https://api.lever.co/v0/postings/${s.board}?mode=json`)) as
      | { id: string; text: string; hostedUrl: string; workplaceType?: string; categories?: { location?: string } }[]
      | null;
    return (Array.isArray(data) ? data : []).map((j) => {
      const location = j.categories?.location ?? "";
      return {
        id: `lv-${s.board}-${j.id}`,
        title: j.text,
        company: s.company,
        location,
        remote: j.workplaceType === "remote" || REMOTE.test(location),
        url: j.hostedUrl,
        source: "lever" as const,
        seniority: SENIOR.test(j.text) ? ("senior" as const) : ("standard" as const),
      };
    });
  }

  const data = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${s.board}`)) as
    | { jobs?: { id: string; title: string; jobUrl: string; location?: string; isRemote?: boolean; isListed?: boolean }[] }
    | null;
  return (data?.jobs ?? [])
    .filter((j) => j.isListed !== false)
    .map((j) => ({
      id: `ab-${s.board}-${j.id}`,
      title: j.title,
      company: s.company,
      location: j.location ?? "",
      remote: Boolean(j.isRemote) || REMOTE.test(j.location ?? ""),
      url: j.jobUrl,
      source: "ashby" as const,
      seniority: SENIOR.test(j.title) ? ("senior" as const) : ("standard" as const),
    }));
}

/**
 * Live openings whose title matches the target role.
 *
 * Non-senior roles first, then spread across companies so one large board
 * (Stripe lists 700+ jobs) cannot fill the whole list.
 */
export async function findOpportunities(roleTitle: string, limit = 8): Promise<{ jobs: Opportunity[]; total: number; companies: number }> {
  const pattern = patternForRole(roleTitle);
  const all = (await Promise.all(SOURCES.map(fetchSource))).flat();
  const matched = all.filter((j) => pattern.test(j.title));

  matched.sort((a, b) =>
    a.seniority === b.seniority ? a.company.localeCompare(b.company) : a.seniority === "standard" ? -1 : 1
  );

  // Round-robin across companies.
  const byCompany = new Map<string, Opportunity[]>();
  for (const j of matched) {
    const list = byCompany.get(j.company) ?? [];
    list.push(j);
    byCompany.set(j.company, list);
  }
  const picked: Opportunity[] = [];
  while (picked.length < limit && byCompany.size > 0) {
    for (const [company, list] of Array.from(byCompany.entries())) {
      const next = list.shift();
      if (next) picked.push(next);
      if (list.length === 0) byCompany.delete(company);
      if (picked.length >= limit) break;
    }
  }

  return { jobs: picked, total: matched.length, companies: new Set(matched.map((j) => j.company)).size };
}
