/**
 * Sample data for the ASCENDR Networks interactive preview on /networks.
 *
 * ILLUSTRATIVE ONLY. "Northstar Ventures", its portfolio companies and every
 * member below are invented, and the page labels them as sample data. Nothing
 * here may be presented as a customer, a result, or a real person.
 *
 * Honesty constraint (PRD section 6): relationships are expressed as shared
 * membership of the organisation's own network or communities, which an org
 * customer genuinely provides. Never "2nd-degree" or "mutual connections".
 */

export type Band = "strong" | "partial" | "stretch";

export type Candidate = {
  id: string;
  name: string;
  location: string;
  current: string;
  band: Band;
  /** Why this person appears. Each reason maps to a real data point. */
  reasons: string[];
  /** Core skills still missing for this role. Empty for strong fits. */
  missing: string[];
  community: string;
};

export type PortfolioRole = {
  id: string;
  company: string;
  title: string;
  stage: string;
  coreSkills: string[];
  candidates: Candidate[];
  /** Learning path ASCENDR would assign to partial fits. */
  path: string;
};

export const NETWORK = {
  name: "Northstar Ventures",
  kind: "Portfolio talent network · London, Berlin, New York",
  members: 1240,
  companies: 38,
  kpis: [
    { label: "Career activation", value: "62%", note: "set a goal and received a plan" },
    { label: "Action within 7 days", value: "41%", note: "completed a career action" },
    { label: "Intros made in network", value: "86", note: "last 90 days" },
    { label: "Hires from the network", value: "14", note: "into portfolio companies" },
  ],
};

export const ROLES: PortfolioRole[] = [
  {
    id: "ledgerly-pm",
    company: "Ledgerly",
    title: "Senior Product Manager",
    stage: "Series A · Fintech · London",
    coreSkills: ["Product discovery", "Product analytics", "Roadmapping", "Stakeholder management", "Fintech domain"],
    path: "Product analytics path",
    candidates: [
      { id: "c1", name: "Priya Raman", location: "London", current: "Product Manager, Tally", band: "strong", reasons: ["Holds 5 of 5 core skills", "3 years in fintech", "Member of Product Leaders"], missing: [], community: "Product Leaders" },
      { id: "c2", name: "Daniel Moreau", location: "Paris", current: "Associate PM, Fieldwise", band: "strong", reasons: ["Holds 4 of 5 core skills", "Already inside the portfolio"], missing: ["Fintech domain"], community: "Northstar Operators" },
      { id: "c3", name: "Sarah Collins", location: "Dublin", current: "Customer Support Lead, Kora Health", band: "partial", reasons: ["Customer insight and analytics transfer", "Working on discovery now"], missing: ["Product analytics", "Roadmapping"], community: "Product Leaders" },
      { id: "c4", name: "Tom Becker", location: "Berlin", current: "Business Analyst, Tessera", band: "partial", reasons: ["Strong analytics", "Has shipped internal tools"], missing: ["Product discovery", "Fintech domain"], community: "Northstar Operators" },
      { id: "c5", name: "Lina Haddad", location: "Amsterdam", current: "UX Researcher, Ledgerly", band: "partial", reasons: ["Discovery is her day job", "Already at Ledgerly"], missing: ["Product analytics", "Roadmapping"], community: "Design Guild" },
      { id: "c6", name: "Lukas Weber", location: "Munich", current: "Operations Manager, Brightpath", band: "stretch", reasons: ["Stakeholder management", "Set PM as his goal 3 weeks ago"], missing: ["Product discovery", "Product analytics", "Roadmapping"], community: "Career Switchers" },
    ],
  },
  {
    id: "kora-ds",
    company: "Kora Health",
    title: "Data Scientist",
    stage: "Seed · Healthtech · New York",
    coreSkills: ["Python", "Statistics", "Machine learning", "SQL", "Experiment design"],
    path: "Applied machine learning path",
    candidates: [
      { id: "d1", name: "Grace Miller", location: "New York", current: "Data Analyst, Ledgerly", band: "strong", reasons: ["Holds 5 of 5 core skills", "Inside the portfolio"], missing: [], community: "Data Circle" },
      { id: "d2", name: "Ravi Patel", location: "Toronto", current: "Analytics Engineer, Tally", band: "partial", reasons: ["Python, SQL, statistics", "Completed 2 of 4 ML modules"], missing: ["Machine learning", "Experiment design"], community: "Data Circle" },
      { id: "d3", name: "Emily Chen", location: "Boston", current: "Research Assistant, partner university", band: "partial", reasons: ["Statistics and experiment design", "Alumni network member"], missing: ["SQL", "Machine learning"], community: "Alumni Network" },
      { id: "d4", name: "Joseph Klein", location: "Austin", current: "Software Engineer, Fieldwise", band: "stretch", reasons: ["Strong Python", "Set data science as his goal"], missing: ["Statistics", "Machine learning", "Experiment design"], community: "Northstar Operators" },
    ],
  },
  {
    id: "fieldwise-growth",
    company: "Fieldwise",
    title: "Head of Growth",
    stage: "Series B · Climate tech · Berlin",
    coreSkills: ["Growth strategy", "Lifecycle marketing", "Experimentation", "Team leadership", "B2B sales"],
    path: "Growth leadership path",
    candidates: [
      { id: "g1", name: "Amelia Hart", location: "London", current: "Growth Lead, Brightpath", band: "strong", reasons: ["Holds 5 of 5 core skills", "Led a team of 6"], missing: [], community: "Growth Collective" },
      { id: "g2", name: "Marco Silva", location: "Lisbon", current: "Senior Marketer, Tessera", band: "partial", reasons: ["Lifecycle and experimentation", "Mentored by a portfolio CMO"], missing: ["Team leadership", "B2B sales"], community: "Growth Collective" },
      { id: "g3", name: "Hannah Wright", location: "Chicago", current: "Account Executive, Ledgerly", band: "stretch", reasons: ["B2B sales", "Set growth as her goal"], missing: ["Growth strategy", "Lifecycle marketing", "Experimentation"], community: "Northstar Operators" },
    ],
  },
];

/** Network-wide skill supply vs portfolio demand. Counts of people. */
export const SKILL_SUPPLY = [
  { skill: "Product analytics", demand: 14, have: 6, learning: 11 },
  { skill: "Machine learning", demand: 9, have: 5, learning: 7 },
  { skill: "Lifecycle marketing", demand: 7, have: 8, learning: 3 },
  { skill: "Enterprise sales", demand: 12, have: 4, learning: 2 },
  { skill: "Kubernetes", demand: 6, have: 7, learning: 4 },
];

/* ---------------- Member view ---------------- */

export type MemberStep = {
  key: string;
  label: string;
  title: string;
  body: string;
  items?: { name: string; detail: string; reasons?: string[]; tag?: string }[];
};

export type Persona = {
  id: string;
  name: string;
  from: string;
  to: string;
  band: Band;
  steps: MemberStep[];
};

export const PERSONAS: Persona[] = [
  {
    id: "sarah",
    name: "Sarah",
    from: "Customer Support Lead",
    to: "Product Manager",
    band: "partial",
    steps: [
      { key: "goal", label: "Goal", title: "Product Manager within 9 months", body: "Sarah sets one goal. ASCENDR matches it to a defined role with known skill requirements." },
      { key: "gaps", label: "Gaps", title: "3 strengths carry over. 3 core skills are missing.", body: "Worked out from the role's requirements minus her skills. Computed, not guessed.", items: [
        { name: "Communication", detail: "Carries over", tag: "have" },
        { name: "Customer insight", detail: "Carries over", tag: "have" },
        { name: "Product discovery", detail: "Missing · priority 1", tag: "gap" },
        { name: "Product analytics", detail: "Missing · priority 2", tag: "gap" },
        { name: "Roadmapping", detail: "Missing · priority 3", tag: "gap" },
      ] },
      { key: "learn", label: "Learn", title: "A 90-day plan, ordered by what blocks her first", body: "Each module is tied to one gap, so finishing it moves her fit band.", items: [
        { name: "Days 1-30", detail: "Discovery interviews · 4 practice interviews with real users" },
        { name: "Days 31-60", detail: "Product analytics · build one dashboard on her team's data" },
        { name: "Days 61-90", detail: "Roadmapping · draft a quarter roadmap and review it with a mentor" },
      ] },
      { key: "people", label: "People", title: "3 people who already made this move", body: "Every match says why it was made.", items: [
        { name: "Priya Raman", detail: "Product Manager, Tally", reasons: ["Holds your target role", "Expert in product discovery, your first gap", "Both in Product Leaders"] },
        { name: "Lina Haddad", detail: "UX Researcher, Ledgerly", reasons: ["Runs discovery interviews weekly", "Same network"] },
      ] },
      { key: "roles", label: "Roles", title: "7 roles in the network, 2 already within reach", body: "Fit shown as a band, with the one thing that would raise it.", items: [
        { name: "Associate PM · Ledgerly", detail: "Strong fit", reasons: ["4 of 5 core skills after this quarter", "Missing: roadmapping"], tag: "strong" },
        { name: "Senior PM · Ledgerly", detail: "Partial fit", reasons: ["Missing: product analytics, roadmapping"], tag: "partial" },
      ] },
      { key: "outcome", label: "Outcome", title: "Intro requested. Interview booked in week 7.", body: "Logged as an outcome, so the network can see that its talent work produced an interview, not just activity." },
    ],
  },
  {
    id: "joseph",
    name: "Joseph",
    from: "Software Engineer",
    to: "Data Scientist",
    band: "stretch",
    steps: [
      { key: "goal", label: "Goal", title: "Data Scientist within 12 months", body: "A real career change. ASCENDR is clear that it is a stretch and plans for that." },
      { key: "gaps", label: "Gaps", title: "Python carries over. 3 core skills are missing.", body: "Computed from the role's requirements.", items: [
        { name: "Python", detail: "Carries over", tag: "have" },
        { name: "SQL", detail: "Carries over", tag: "have" },
        { name: "Statistics", detail: "Missing · priority 1", tag: "gap" },
        { name: "Machine learning", detail: "Missing · priority 2", tag: "gap" },
        { name: "Experiment design", detail: "Missing · priority 3", tag: "gap" },
      ] },
      { key: "learn", label: "Learn", title: "A 12-month plan in three stages", body: "Statistics first, because every later module depends on it.", items: [
        { name: "Months 1-3", detail: "Applied statistics · one analysis on real portfolio data" },
        { name: "Months 4-8", detail: "Machine learning · two shipped models with a mentor review" },
        { name: "Months 9-12", detail: "Experiment design · run one live A/B test" },
      ] },
      { key: "people", label: "People", title: "2 people who made the same switch", body: "Every match says why.", items: [
        { name: "Grace Miller", detail: "Data Analyst, Ledgerly", reasons: ["Moved from engineering to data", "Both in Data Circle"] },
      ] },
      { key: "roles", label: "Roles", title: "Data roles in the network, shown honestly", body: "None are within reach yet. ASCENDR shows which ones will be after stage 2.", items: [
        { name: "Data Scientist · Kora Health", detail: "Stretch", reasons: ["Missing: statistics, machine learning, experiment design"], tag: "stretch" },
      ] },
      { key: "outcome", label: "Outcome", title: "Statistics certified in month 3", body: "Logged as a verified skill. His fit band for Kora Health moves from stretch to partial." },
    ],
  },
  {
    id: "amelia",
    name: "Amelia",
    from: "Growth Lead",
    to: "Head of Growth",
    band: "strong",
    steps: [
      { key: "goal", label: "Goal", title: "Head of Growth within 6 months", body: "A step up, not a switch. ASCENDR focuses on the jump in scope." },
      { key: "gaps", label: "Gaps", title: "Ready on skills. One leadership gap.", body: "She holds every core skill. The plan targets the experience gap instead.", items: [
        { name: "Growth strategy", detail: "Carries over", tag: "have" },
        { name: "Experimentation", detail: "Carries over", tag: "have" },
        { name: "Team leadership at scale", detail: "Experience gap", tag: "gap" },
      ] },
      { key: "learn", label: "Learn", title: "Leadership, through people rather than courses", body: "Two sessions with portfolio CMOs and one cohort programme.", items: [
        { name: "Weeks 1-4", detail: "Hiring a growth team · session with a portfolio CMO" },
        { name: "Weeks 5-12", detail: "Leadership cohort · Growth Collective" },
      ] },
      { key: "people", label: "People", title: "Founders who are hiring for this role", body: "The network can see who is ready. Amelia can see who is hiring.", items: [
        { name: "Fieldwise founder", detail: "Hiring Head of Growth", reasons: ["Your skills cover all 5 core requirements", "Same portfolio network"] },
      ] },
      { key: "roles", label: "Roles", title: "1 role, strong fit", body: "Ready now.", items: [
        { name: "Head of Growth · Fieldwise", detail: "Strong fit", reasons: ["5 of 5 core skills", "Led a team of 6"], tag: "strong" },
      ] },
      { key: "outcome", label: "Outcome", title: "Hired at Fieldwise", body: "A portfolio hire sourced and developed inside the network. That is the number a platform team reports to its partners." },
    ],
  },
];
