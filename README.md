# ASCENDR

**Your Network. Your Skills. Your Next Opportunity.**

ASCENDR is an AI-powered career intelligence platform that connects your
goals, skills, mentors, professional network and opportunities — helping you
turn career ambition into measurable progress.

---

## What it does

ASCENDR answers five questions for a member:

1. **Where am I now?** — profile, experience, skills
2. **Where do I want to go?** — a concrete career goal and target role
3. **What am I missing?** — skill gaps computed against real role requirements
4. **Who can help me?** — mentors, experts and peers, each with stated reasons
5. **What should I do next?** — a ranked, trackable next best action

It is deliberately **not** a mentorship marketplace, a course platform, a job
board, or a chatbot wrapper. See `PRD.md` for the positioning and why it
changed.

---

## Documentation

| File | Read it when |
|---|---|
| **`ARCHITECTURE-ESSENTIALS.md`** | **Start here.** Ten-minute orientation before your first commit |
| `ARCHITECTURE.md` | You need the full schema, routes, or data flows |
| `PRD.md` | You need to know what ships when, and why |
| `AGENTS.md` | You are an AI coding agent, or writing code in this repo |
| `SECURITY-AUDIT.md` | Before touching auth, RLS, the AI routes, or ingestion |

Historical product material lives in `docs/` and is superseded by `PRD.md`.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | React 18, Tailwind CSS |
| Database | Supabase Postgres, Row Level Security, pgvector |
| Auth | Supabase Auth (`@supabase/ssr`), cookie-based |
| AI | OpenAI `gpt-4o-mini`, `text-embedding-3-small` |
| Hosting | Vercel |

Five runtime dependencies. Adding one requires justification in the PR.

---

## Local setup

**Prerequisites:** Node 20+, a Supabase project, optionally an OpenAI key.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
#    fill in your Supabase project values

# 3. Apply migrations
#    Supabase dashboard → SQL Editor → run supabase/migrations/*.sql IN ORDER

# 4. Run
npm run dev
```

Open http://localhost:3000.

### Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=          # Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # server only — never prefix NEXT_PUBLIC_
NEXT_PUBLIC_APP_URL=http://localhost:3000

OPENAI_API_KEY=                    # optional
OPENAI_MODEL=gpt-4o-mini           # optional
OPENAI_EMBED_MODEL=text-embedding-3-small   # optional
```

**The app builds and runs without `OPENAI_API_KEY`.** AI features return a
clear "not configured" message rather than failing. Preserve this property.

The service role key bypasses all Row Level Security. It must never appear in
client code or in a `NEXT_PUBLIC_` variable.

---

## Migrations

Applied **in order**, by hand, in the Supabase SQL editor. All are idempotent
and safe to re-run.

| # | File | Contents |
|---|---|---|
| 0001 | `phase1_foundation` | Profiles, communities, channels, feed, notifications, XP, live sessions, AI tables |
| 0002 | `rls_policies` | RLS helper functions and membership-scoped policies |
| 0003 | `realtime_reactions_reads_notifications` | Realtime, reactions, read receipts |
| 0004 | `mentor_clone_rag` | `ai_chunks` extensions, `match_ai_chunks` RPC |
| 0005 | `live_sessions_qa` | Live Q&A |
| 0006 | `feed_reactions_comments` | Feed engagement |
| 0007 | `networking` | Connections and direct messages |
| 0008 | `onboarding_goals` | Career goal fields on `profiles` |
| 0009 | `live_polls` | Live session polls |
| 0010 | `live_chat_presence_ai_studio` | Live chat, presence, AI studio |
| 0011 | `career_graph` | Skills, roles, goals, actions, outcomes, privacy, quotas, analytics |

Moving to the Supabase CLI with linked staging and production environments is
tracked work — see `SECURITY-AUDIT.md` M-6.

---

## Project structure

```
src/
  app/
    page.tsx          Public landing
    login/            Auth
    onboarding/       Goal capture
    app/              Authenticated product
      ai/               Coach, career plan, interview, resume
      communities/      Channels, live sessions, mentor clones
      feed/ learn/ live/ members/ networking/ settings/
    api/ai/           OpenAI route handlers
  components/         Shared UI
  lib/
    ai.ts             All model access
    usage.ts          Quota enforcement
    career/gap.ts     Skill gap engine
    supabase/         Client, server, middleware
supabase/migrations/  Schema
docs/                 Historical product material
public/prototype/     Early clickable prototype
```

---

## Core concepts

### Two user IDs

`auth.users.id` is the Supabase Auth user. `profiles.id` is the app identity,
and **every domain table foreign-keys to it**. Resolve with
`getCurrentProfile()` in TypeScript, `current_profile_id()` in SQL. Confusing
the two compiles cleanly and fails at runtime.

### RLS is the authorization layer

There is no permissions middleware. Access control lives in Postgres policies.
A query returning nothing is usually a policy working correctly.

### The Career Graph

Seven node types — Person, Skills, Goals, Knowledge, Relationships,
Opportunities, Outcomes — implemented as a projection over relational tables,
not a separate graph store.

### Deterministic logic, narrated by AI

Skill gaps, match bands and recommendation ordering are computed in code. The
model phrases results; it never derives them. A hallucinated skill gap gets
acted on by a real person.

Related: the product surfaces match **bands** (strong / partial / stretch),
never percentages. See `AGENTS.md` §2.2.

---

## Contributing

Read `AGENTS.md` before writing code. In short:

- Server Components by default; `"use client"` only when you need state or handlers
- Mutations are Server Actions in colocated `actions.ts` files
- New tables holding user data need RLS policies in the same PR
- New AI routes must call `consumeQuota()` before any model call
- Update `src/lib/types.ts` when you change the schema — types are hand-written
- Update `ARCHITECTURE.md` when schema, routes or dependencies change

```bash
npm run dev     # development
npm run build   # production build — must pass
npm run lint    # must pass
```

---

## Deployment

Vercel, auto-deploying from `main`. Set the environment variables above in
project settings, then apply any new migrations in Supabase **before** the
deploy that depends on them.

---

## Current state

The authorization model, community and live features, and the citation-backed
mentor clone are built and working. The Career Graph schema landed in 0011.

Known gaps, in priority order:

1. AI routes need quota enforcement wired in — see `SECURITY-AUDIT.md` C-1
2. ESCO taxonomy ingestion, to populate `skills` and `role_profiles`
3. Opportunity ingestion from public ATS job boards
4. Error, loading and empty-state boundaries
5. Monitoring and analytics

Roadmap and phase gates are in `PRD.md` §8.

---

*Rise. Learn. Connect. Lead.*
