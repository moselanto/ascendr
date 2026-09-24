/**
 * The Career Intelligence walkthrough shown on the public homepage.
 *
 * This is an ILLUSTRATIVE EXAMPLE, not a real member. The section that renders
 * it labels it as such — see CareerJourney.tsx. It is deliberately isolated
 * here as one typed object so the section can be driven by live engine output
 * later without touching the component:
 *
 *   const journey = await buildJourney(demoProfileId);  // analyzeGap() + recommenders
 *
 * That swap is not possible yet: `skills` and `role_profiles` are empty until
 * the ESCO taxonomy is ingested, so analyzeGap() currently returns
 * band: "unknown" with no gaps for everyone. See PRD.md section 8, phase 3.
 *
 * HONESTY CONSTRAINT (PRD.md section 6): the network steps below describe
 * shared community membership, which ASCENDR genuinely computes today. Do not
 * reword them into "shared connections", "2nd-degree", or "warm introduction
 * available" — LinkedIn's API does not permit importing a connection graph, so
 * those claims are not backed by anything we can build.
 */

export type JourneyStep = {
  /** Stable key, also used as the step anchor. */
  id: string;
  /** What ASCENDR did — the quiet label above the result. */
  label: string;
  /** The result itself — the line that carries the section. */
  headline: string;
  /** Optional supporting items, rendered as chips. */
  items?: string[];
};

export type Journey = {
  personaName: string;
  currentRole: string;
  goal: string;
  steps: JourneyStep[];
  outcome: string;
};

export const DEMO_JOURNEY: Journey = {
  personaName: "Sarah",
  currentRole: "Customer Support Lead",
  goal: "Product Manager",
  steps: [
    {
      id: "analyse",
      label: "ASCENDR reads her profile",
      headline: "3 transferable strengths, 3 gaps",
      items: ["Communication", "Customer insight", "Analytics"],
    },
    {
      id: "gap",
      label: "Against what the role actually requires",
      headline: "Missing: product discovery, product analytics, roadmapping",
    },
    {
      id: "learn",
      label: "Learning that closes those gaps",
      headline: "4 modules, sequenced by what blocks her first",
      items: ["Discovery interviews", "Product analytics", "Roadmapping", "Prioritisation"],
    },
    {
      id: "mentors",
      label: "People who have done this move",
      headline: "3 mentors who hold her target role",
    },
    {
      id: "communities",
      label: "Where that conversation happens daily",
      headline: "2 communities matched to her goal",
    },
    {
      id: "opportunities",
      label: "Roles she could realistically reach",
      headline: "7 openings — 2 strong, 5 stretch",
    },
    {
      id: "network",
      label: "Who she already shares a room with",
      headline: "2 members of those communities hold the role she wants",
    },
    {
      id: "act",
      label: "Turned into something she can do today",
      headline: "1 introduction requested, 1 module started",
    },
  ],
  outcome: "Career plan activated",
};
