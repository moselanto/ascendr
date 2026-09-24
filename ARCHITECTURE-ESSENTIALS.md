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
| Skills | `skills`, `user_skills` | Schema built, needs ESCO seed |
| Goals | `career_goals`, `career_plans` | Built |
| Knowledge | `ai_sources`, `ai_chunks` | Built (RAG with citations) |
| Relationships | `communities`, `community_members`, connections, `live_sessions` | Built |
| Opportunities | — | **Not built** |
| Outcomes | `career_actions`, `career_outcomes` | Schema built |

The graph is a **projection over these tables**, not a separate store. Do not
introduce a graph database or parallel node/edge tables that need dual writes.

---

## Directory map

```
src/
  app/
    page.tsx              Public landing (~19KB, needs extraction)
    login/, onboarding/   Auth flows
    auth/callback/        OAuth handler
    app/                  Authenticated product
      page.tsx              Dashboard
      ai/                   Coach, career plan, interview, resume
      communities/[slug]/   Channels, live sessions, mentor clone
      feed/, learn/, live/, members/, networking/, settings/
      *-actions.ts          Server Actions
    api/ai/               OpenAI route handlers
  components/mentor/      Shared mentor UI
  lib/
    ai.ts                 All model access
    data.ts               getCurrentProfile()
    usage.ts              Quota enforcement
    career/gap.ts         Skill gap engine
    supabase/             client / server / middleware
    types.ts              Hand-written domain types
    xp.ts
  middleware.ts           Session refresh
supabase/migrations/      0001–0011, applied in order
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

- Mentor ingestion chunks and embeds **on the request path** — large sources
  time out and strand `ai_sources.status = 'processing'`
- RAG similarity floor is `0.2`, loose enough to pass weak matches as grounded
- No `error.tsx` / `loading.tsx` / `not-found.tsx` anywhere
- No security headers in `next.config.mjs`
- No tests, no CI

---

## Where to go next

| Question | File |
|---|---|
| Why does the product exist, what ships when | `PRD.md` |
| Full schema, routes, data flows | `ARCHITECTURE.md` |
| Conventions and hard rules | `AGENTS.md` |
| Known vulnerabilities and remediation | `SECURITY-AUDIT.md` |
| Setup and deployment | `README.md` |
