# PRD.md

ASCENDR — Product Requirements

Last updated: 2026-09-24
Supersedes: `docs/ASCENDR_Global_Product_Strategy_Master_PRD.md`

---

## 1. Positioning

**ASCENDR is the career intelligence platform that understands where you are,
where you want to go, what you're missing, who can help you, and which
opportunities can move your career forward.**

Hero: **Your Network. Your Skills. Your Next Opportunity.**

Supporting statement: *ASCENDR is an AI-powered career intelligence platform
that connects your goals, skills, mentors, professional network and
opportunities — helping you turn career ambition into measurable progress.*

### What changed and why

The previous positioning — *"Accelerate your career with AI and world-class
mentors"* — is understandable to a consumer but places ASCENDR in an extremely
crowded category. It invites the question *"why does the world need another
platform combining LinkedIn, Coursera, BetterUp and communities?"*, which is
difficult to answer well.

The repositioning moves from a **feature bundle** (AI + mentors + learning +
community) to a **capability**: turning career ambition into an actionable
path, and connecting people to the knowledge, relationships and opportunities
required to achieve it.

### What ASCENDR is not

Not a mentorship marketplace. Not a LinkedIn clone. Not a course platform. Not
a job board. Not a chatbot wrapper. Not a social network.

Comparisons to LinkedIn / Coursera / BetterUp / Upwork / Skool are for internal
competitive analysis only and must never appear in external material.

---

## 2. The core loop

```
GOAL → UNDERSTAND → IDENTIFY GAPS → LEARN → CONNECT → ACT
     → OPPORTUNITY → OUTCOME → LEARN FROM OUTCOME → NEXT MOVE
```

Every feature reinforces this loop or is out of scope.

---

## 3. The Career Graph

The long-term moat. Seven node types:

| Node | Question |
|---|---|
| PERSON | Who am I? |
| SKILLS | What can I do? |
| GOALS | Where do I want to go? |
| KNOWLEDGE | What do I need to learn? |
| RELATIONSHIPS | Who can help me? |
| OPPORTUNITIES | What's available? |
| OUTCOMES | What happened? |

Implemented as a projection over relational tables, not a separate graph
store. See `ARCHITECTURE.md` §5.4.

---

## 4. The three experiences

### 4.1 Career Intelligence — "What should I do next?"

Inputs: current role, history, skills, experience, interests, goal, target
role, target industry, target companies, location preference.

Output — the **Career Intelligence Report**:

- Current position and target
- Skill gaps and experience gaps, ranked
- Recommended skills, learning, people, communities, opportunities
- Next best action
- 30 / 60 / 90-day plan

**Requirement:** gaps are computed deterministically from
`role_required_skills` minus `user_skills`. The model narrates; it never
derives. A hallucinated gap gets acted on by a real person.

### 4.2 Human Expertise — "Who can help me?"

Matching across mentors, experts, peers, alumni, founders, hiring managers and
community leaders, considering goal, skills, industry, experience, location,
expertise, availability and shared communities.

**Requirement:** never a plain directory. Every recommendation answers *"why
this person?"* with reasons traceable to rows:

> **Sarah Johnson** — Senior Product Manager
> Holds your target role · Works in your target industry ·
> Has expertise in product discovery, which is one of your gaps ·
> Both in Product Leaders Community
> → **Request Connection**

**Constraint:** "shared connections" and "2nd-degree" claims are prohibited
until a real graph exists. See §6.

### 4.3 Opportunity Intelligence — "Where can I apply this?"

Jobs, internships, freelance and consulting work, startup and founder
opportunities, events, communities, collaborations, introductions.

**Requirement:** never a plain job board. Every opportunity explains fit:

> **Product Manager — Company X** — **Strong match**
> 4 of 5 core skills · Relevant industry experience · Target role
> Missing: product analytics
> → **Close this gap** or **Apply**

**Requirement:** bands (`strong` / `partial` / `stretch`), never percentages.
A "87% match" claims a calibration the system does not have, and the first user
who disagrees will be right. Numeric coverage stays internal.

---

## 5. Data sources

| Need | Source | Status |
|---|---|---|
| Skills taxonomy | ESCO — 13,485 skills, 28 languages, open API, EUPL 1.2 | Approved |
| Role profiles | ESCO occupations, ISCO-08 mapped | Approved |
| Opportunities | Public ATS boards — Greenhouse, Lever, Ashby, SmartRecruiters | Approved |
| Relationships | Native: communities, live sessions, connections | Built |
| Knowledge | Mentor-uploaded content, RAG with citations | Built |

A controlled skills vocabulary is a hard prerequisite. Free-text skills cannot
be diffed, scored or aggregated — "SQL", "sql" and "Structured Query Language"
would be three unrelated skills, and every gap, match and recommendation in
this document would be noise.

---

## 6. Constraint: the network graph

**LinkedIn connection data is not obtainable.** The Connections API returns
only 1st-degree connections, requires Partner Program approval, and per
Microsoft's documentation *"2nd-degree connections are not available from
LinkedIn."* The API Terms separately prohibit accessing a member's network
without express permission.

Therefore, for the foreseeable roadmap:

- **"Network" means** shared community membership, shared live sessions, and
  native ASCENDR connections
- **Permitted:** *"James is in two of your communities and holds your target
  role"*
- **Prohibited:** *"2 shared professional connections"*, *"1 warm
  introduction available"*, any 2nd-degree claim

This is honest, computable today, and survives scrutiny from a reviewer who
knows this space. It also shapes sequencing: organizations arrive with a
pre-existing network, individuals do not. That is the strongest argument for
the B2B motion in §9 — but it does not change the MVP, which is consumer.

---

## 7. MVP scope

The vertical slice. A member goes from *"I want to become a Product Manager"*
to *"here is my roadmap, these are my gaps, these are the people I should meet,
these are the communities I should join, these are the opportunities I should
pursue"* — demonstrable in five minutes.

```
PROFILE → CAREER GOAL → AI CAREER ANALYSIS → CAREER ROADMAP
        → MENTOR MATCHING → COMMUNITY → OPPORTUNITY MATCHING → OUTCOME TRACKING
```

### In scope

| Screen | Purpose |
|---|---|
| Onboarding | Capture role, history, skills, goal in under 2 minutes |
| Career Dashboard | Goal, progress, gaps, next best actions |
| Career Intelligence | The report |
| Career Roadmap | 30 / 60 / 90-day timeline, actions markable complete |
| Skills Gap | Ranked gaps with recommended learning |
| Recommended People | Matched experts, each with reasons |
| Communities | Existing, reframed around goals |
| Opportunities | Matched roles with fit explanation |
| Career AI | Structured cards, not walls of text |
| Public homepage | Outcome-led, demonstrating the loop |

### Explicitly out of scope until gated

ASCENDR Networks, VC dashboards, university admin, enterprise / internal
mobility. These are separate products with separate buyers and require an
`organizations` table, org-scoped RLS, aggregate analytics and admin roles —
a platform layer that does not exist.

**Gate:** a signed design partner plus the `organizations` migration. Not
unlocked by adding a route.

---

## 8. Build order

| Phase | Scope | Est. | Gate |
|---|---|---|---|
| **0** | Hardening: quotas, error boundaries, monitoring, RAG threshold, async ingestion | ~1 wk | — |
| **1** | Career Graph schema + ESCO ingestion | 2–3 wks | Phase 0 |
| **2** | Career Intelligence vertical slice | 3–4 wks | Phase 1 |
| **3** | Opportunity Intelligence, ATS ingestion | ~3 wks | Phase 2 |
| **4** | Homepage and public site | ~2 wks | Phase 2 |
| **5** | ASCENDR Networks | 4 wks+ | Signed design partner |
| **6** | Monetization: Stripe, tiers | 2–3 wks | Phase 2 |

Phase 0 is non-negotiable and first. The AI routes are currently unmetered,
which is an open funding line to anyone who finds them.

Phase 4 deliberately follows Phase 2 so the homepage demo runs on the real
engine. A live demo driven by the actual pipeline is more persuasive than an
animated mockup and cheaper than building the mockup twice.

---

## 9. Monetization

Built into the architecture from the start: `usage_counters` and
`consume_quota()` ship in Phase 0 as abuse control and become plan enforcement
in Phase 6. One mechanism, not two.

### Consumer (hypotheses to validate, not fixed prices)

| Tier | Target | Includes |
|---|---|---|
| Free | $0 | Career profile, basic AI coach, communities, basic networking, limited roadmap |
| Pro | $15–25/mo | Advanced career intelligence, full roadmap, resume optimization, interview prep, advanced matching, learning paths |
| Premium | $39–79/mo | Premium AI, mentor access, expert communities, priority matching, interview simulations |

These figures are US-anchored. If the beachhead market is East Africa — which
`communities.price_kes` suggests — they require revalidation against local
willingness to pay before they appear anywhere public.

### B2B (the long-term engine)

| Segment | Model | Indicative |
|---|---|---|
| Universities | Annual SaaS | $10k–50k/yr |
| Companies | Per-seat SaaS | — |
| VC funds | Portfolio platform | — |
| Accelerators | Program platform | — |
| Associations | Member platform | — |

No advertising.

---

## 10. Metrics

Do not optimize for registered users.

| Metric | Definition |
|---|---|
| **Career activation** | % who create a goal and receive a plan |
| **Network activation** | % who connect with a mentor, expert or community |
| **Career action** | % completing a meaningful action within 7 days |
| **Career outcome** | % achieving a measurable outcome within 90 days |

Tracked outcomes: interviews, offers, jobs started, promotions, raises,
introductions made, skills certified, projects won, funding raised.

Implemented as the `career_activation_metrics` SQL view so product dashboards
and external materials cannot diverge.

`career_outcomes.verification` distinguishes `self_reported` from
`partner_confirmed` and `document_verified`. Report the distinction.

---

## 11. Product principles

**AI trust.** Every recommendation shows why: based on your skills, your goal,
your experience, this opportunity. Factual answers cite sources. No black box.

**Privacy first.** Profile, connection, network, mentor availability, employer
and opportunity visibility are all user-controlled via `profile_privacy`.
Never expose a member's network data without explicit authorization.

**Gamification serves outcomes.** XP and streaks must not become the product.
Prefer *"Career Momentum +12"* over *"Earn XP!"*, tied to real actions: skill
completed, mentor conversation held, interview completed, milestone reached.

**Honest claims.** No fabricated testimonials, user counts or country counts.
The current site's *"Trusted by learners in 40+ countries"*, the 40+/24/7/100%
stat bar, and the Aisha O. / David M. / Grace N. testimonials are placeholders
presented as fact and must be replaced or removed before any traffic push.

**Simplicity.** Do not expose every feature at once. The member should always
know: where am I, where am I going, what's missing, who can help, what next.

---

## 12. Design direction

ASCENDR should read as professional intelligence infrastructure, not an online
course marketplace.

**Avoid:** generic AI gradients, heavy purple, robot imagery, stock photos of
smiling professionals, excessive glassmorphism, SaaS template patterns,
everything rounded, excessive animation.

**Use:** premium editorial layout, strong typography, real data visualization,
career and network graphs, progress visualization, clean cards, subtle motion,
generous whitespace, sophisticated hierarchy.

The highest-leverage change is not the palette — it is replacing decorative
iconography with **actual data**: a real skill-gap chart, a real relationship
graph, a real progress timeline.

### Navigation

Home · Career · Network · Opportunities · Communities · Learn · AI · Messages ·
Notifications · Profile

Primary CTA: **My Career Plan**, persistent throughout.

### Responsive

Desktop 1920×1080 and 1440×900, tablet 1024×768, mobile 390×844. Recompose
layouts; do not shrink desktop.

### States

Every major component: default, loading, empty, error, success,
locked/premium, unavailable, first-time, returning.
AI components additionally: generating, analyzing, citation, recommendation,
action.

---

## 13. Success criteria

The MVP is complete when:

1. ASCENDR no longer reads as a mentorship marketplace
2. Career Intelligence is the central experience
3. The Career Graph backs real features
4. The homepage communicates the thesis within five seconds
5. A member creates a career goal in under two minutes
6. AI produces a meaningful career analysis
7. Skill gaps are identified deterministically and explained
8. People recommendations ship with reasons
9. Opportunity matches ship with fit explanations
10. Recommendations convert into tracked actions
11. Outcomes are recorded and reportable
12. Activation and outcome metrics are live
13. The product demos to an investor in five minutes

Criteria concerning B2B networks, VC, university and enterprise are deferred
to Phase 5 and are not MVP criteria.

---

## 14. Open decisions

1. **Beachhead market** — global, or East Africa first? Determines opportunity
   sources, pricing and taxonomy coverage.
2. **Design partner** — is a specific fund, accelerator or university in reach?
   Materially changes Phase 5 timing.
3. **Mentor supply** — how are the first verified experts recruited? Experience
   4.2 is capped by supply, not by code.
4. **Runway** — Phases 0–2 are roughly 6–8 weeks of focused engineering.
