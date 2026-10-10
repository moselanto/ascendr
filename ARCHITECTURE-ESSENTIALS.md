# ARCHITECTURE-ESSENTIALS.md

The ten-minute orientation. Read this before your first commit.
Full detail lives in `ARCHITECTURE.md`; rules for AI agents live in `AGENTS.md`.

Last updated: 2026-09-24

---

## The one-paragraph version

ASCENDR is a Next.js 14 App Router application on Vercel, backed by a single
Supabase Postgres database with Row Level Security and pgvector. There is no
separate API service, no ORM, and no state management library. Server
Components read data directly, Server Actions write it, and a small set of
route handlers under `/api/ai/*` wrap OpenAI. Authentication is Supabase Auth
via cookies, refreshed in middleware on every request.

---

## Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 14.2.33 |
| Language | TypeScript | 5.5 |
| UI | React + Tailwind | 18.3.1 / 3.4 |
| Database | Supabase Postgres + pgvector | — |
| Auth | Supabase Auth (`@supabase/ssr`) | 0.5 |
| AI | OpenAI `gpt-4o-mini`, `text-embedding-3-small` | — |
| Hosting | Vercel | — |

Five runtime dependencies total. Keep it that way — adding one needs a reason
in the PR description.

---

## The two things that trip people up

### 1. There are two user IDs

```
auth.users.id   ← Supabase Auth.        From supabase.auth.getUser()
profiles.id     ← App identity.         From getCurrentProfile()
```

**Every domain table foreign-keys to `profiles.id`.** Using `auth.users.id`
compiles fine and fails at runtime. In SQL, `current_profile_id()` bridges the
two.

### 2. RLS is the authorization layer

There is no permissions middleware. Access control lives in Postgres policies
(`0002_rls_policies.sql`). A query that returns nothing is usually a policy
doing its job, not a bug.

The service role bypasses RLS entirely. It is used server-side for vector
retrieval, XP awards, and quota accounting. **It must never reach the client.**

---

## The domain model

ASCENDR is organised around the **Career Graph** — seven node types:

```
PERSON → SKILLS → GOALS → KNOWLEDGE → RELATIONSHIPS → OPPORTUNITIES → OUTCOMES
```

Current backing:

| Node | Tables | State |
|---|---|---|
| Person | `profiles`, `profile_privacy` | Built |
| Skills | `skills`, `user_skills`, `role_profiles`, `role_required_skills` | Built, seeded from ESCO v1.2 |
| Goals | `career_goals`, `career_plans` | Built |
| Knowledge | `ai_sources`, `ai_chunks` | Built (RAG with citations) |
| Relationships | `communities`, `community_members`, connections, `live_sessions` | Built |
| Opportunities | `saved_opportunities`, `organization_roles` | Built (matching, tracker, network roles) |
| Outcomes | `career_actions`, `career_outcomes` | Built (ledger; network-confirmed steps are `partner_confirmed`) |

Around the graph sit two newer layers:

- **Networks** (`organizations`, `organization_roles`, `org_readiness_snapshots`, `org_pathway_invites`, `org_introductions`): readiness maps, trends, pathways and consented introductions for funds, accelerators and universities. Admins only reach member data through `SECURITY DEFINER` functions that honour each member's sharing switch.
- **Billing** (`subscriptions`): Paystack plans in KES. `getTier()` turns the active plan into daily AI limits.

The graph is a **projection over these tables**, not a separate store. Do not
introduce a graph database or parallel node/edge tables that need dual writes.

---

## Directory map

```
src/
  app/
    page.tsx              Public homepage (composed from components/home)
    login/, onboarding/   Auth and goal capture
    networks/             Public networks demo
    auth/callback/        Email confirmation handler
    api/ai/               Metered OpenAI route handlers
    api/paystack/webhook/ Signed billing webhook
    app/                  Signed-in product
      page.tsx              Dashboard
      career/ learn/ opportunities/ outcomes/ ai/
      members/ mentors/ networking/ communities/
      network/              Network intelligence (organisations)
      notifications/ search/ settings/ plans/ billing/ admin/
      *-actions.ts, */actions.ts   Server actions
  components/             home, app, people, mentor, networks, ui
  lib/
    ai.ts                 All model access
    data.ts               getCurrentProfile()
    usage.ts              Plans, daily limits, getTier()
    billing.ts            Paystack helpers
    career/               gap.ts, roadmap.ts, outcomes.ts
    notifications.ts      Deep links, timeAgo()
    supabase/             client / server / middleware / admin
    types.ts              Hand-written domain types
  middleware.ts           Session refresh and /app guard
supabase/migrations/      0001-0017, applied in order
scripts/seed-esco.mjs     ESCO import
```

---

## Request lifecycle

```
Request
  → middleware.ts               refresh session cookie
  → Server Component            createClient() → query under RLS
  → render
```

Mutations:

```
Client form
  → Server Action (actions.ts)  → validate → write under RLS → revalidatePath
```

AI:

```
POST /api/ai/*
  → getCurrentProfile()         401 if absent
  → consumeQuota()              429 if exhausted
  → lib/ai.ts                   OpenAI
  → JSON response
```

---

## Rules with teeth

1. **No product logic in the LLM.** Gaps, bands, and ordering are computed in
   code. The model narrates.
2. **No match percentages.** Bands only: strong / partial / stretch / unknown.
3. **Every AI route consumes quota.** Unmetered routes are an open funding line.
4. **`ai_chunks` has no client policy.** That is deliberate; it enforces
   per-mentor isolation.
5. **No LinkedIn network data.** Their API forbids it and 2nd-degree is
   unavailable at any tier. "Network" means shared communities and native
   connections.
6. **The app must build and run without `OPENAI_API_KEY`.** `AI_CONFIGURED`
   gates every AI path.

---

## Local setup

```bash
npm install
cp .env.example .env.local     # fill in Supabase values
# apply supabase/migrations/*.sql in order via the Supabase SQL editor
npm run dev
```

Required env:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # server only — never NEXT_PUBLIC_
NEXT_PUBLIC_APP_URL
OPENAI_API_KEY                 # optional; AI degrades gracefully without it
```

---

## Known rough edges

Read `SECURITY-AUDIT.md` before touching these:

- Mentor ingestion chunks and embeds **on the request path**: large sources can time out and strand `ai_sources.status = 'processing'`
- Plan caps (network members, open roles) are shown on the plans page but not enforced
- Readiness snapshots are kept after a member stops sharing
- Types in `lib/types.ts` are hand-written, not generated from the schema
- No automated tests or CI; run the four checks in `README.md` before merging

---

## Where to go next

| Question | File |
|---|---|
| Why does the product exist, what ships when | `PRD.md` |
| Full schema, routes, data flows | `ARCHITECTURE.md` |
| Conventions and hard rules | `AGENTS.md` |
| Known vulnerabilities and remediation | `SECURITY-AUDIT.md` |
| Setup and deployment | `README.md` |
