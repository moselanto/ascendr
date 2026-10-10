import { LIMITS } from "@/lib/usage";

/** Public plan catalogue. Prices are monthly, in KES, billed through Paystack. */
export type PlanKey = "free" | "starter" | "pro" | "custom";

export type Plan = {
  key: PlanKey;
  name: string;
  tagline: string;
  price: string;
  per?: string;
  highlight?: boolean;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free",
    tagline: "Start your career plan.",
    price: "KES 0",
    features: [
      "Skills gap for 1 target role",
      "90-day roadmap and learning paths",
      `${LIMITS["ai:coach"].free} AI coach messages a day`,
      "Communities, mentors and messaging",
      "Try a network: 10 members, 1 role",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    tagline: "Small networks and teams.",
    price: "KES 13,000",
    per: "/month",
    features: [
      `${LIMITS["ai:coach"].starter} AI coach messages a day`,
      `${LIMITS["ai:interview"].starter} mock interviews a day`,
      "Network of up to 50 members",
      "Up to 3 open roles with a readiness map",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "Funds and accelerators running a talent program.",
    price: "KES 26,000",
    per: "/month",
    highlight: true,
    features: [
      `${LIMITS["ai:coach"].pro} AI coach messages a day`,
      "Up to 250 members, unlimited roles",
      "Readiness trend over time",
      "Consented introductions and hire reporting",
    ],
  },
  {
    key: "custom",
    name: "Custom",
    tagline: "Universities and large networks.",
    price: "Let's talk",
    features: ["Unlimited members and cohorts", "Custom roles and skill frameworks", "Single sign-on", "Onboarding and invoicing"],
  },
];

/** Individual plan, shown beside the network plans on public pages. */
export const PLUS = {
  name: "Plus",
  price: "KES 499",
  per: "/month",
  summary: `For individuals: ${LIMITS["ai:coach"].plus} AI coach messages, ${LIMITS["ai:interview"].plus} mock interviews and ${LIMITS["ai:resume-review"].plus} resume reviews a day. Pay by M-Pesa, no automatic renewal.`,
};
