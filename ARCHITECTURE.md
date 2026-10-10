# ARCHITECTURE.md

Full technical reference for ASCENDR.
For a ten-minute orientation, read `ARCHITECTURE-ESSENTIALS.md` instead.

Last updated: 2026-09-24

---

## 1. System overview

ASCENDR is a single Next.js application deployed to Vercel, backed by one
Supabase project. There is no separate backend service, no message queue, no
cache tier, and no ORM.

```
                     ┌──────────────────────────────┐
   Browser ────────▶ │  Vercel — Next.js 14 App     │
                     │                              │
                     │  middleware.ts (session)     │
                     │  Server Components (read)    │
                     │  Server Actions (write)      │
                     │  /api/ai/* (route handlers)  │
                     └───────┬──────────────┬───────┘
                             │              │
                    anon key │              │ service role
                   (RLS on)  │              │ (RLS bypassed)
                             ▼              ▼
                     ┌──────────────────────────────┐
                     │  Supabase Postgres           │
                     │  + RLS policies              │
                     │  + pgvector                  │
                     │  + Auth + Realtime           │
                     └──────────────────────────────┘
                             │
                             ▼
                     ┌──────────────────────────────┐
                     │  OpenAI                      │
                     │  gpt-4o-mini                 │
                     │  text-embedding-3-small      │
                     └──────────────────────────────┘
```

### Design principles

1. **Postgres is the application.** Authorization, constraints, quotas, and
   metrics live in the database, not in a middleware layer that can be bypassed.
2. **Minimal dependency surface.** Five runtime packages. Every addition needs
   justification.
3. **Deterministic logic, narrated by AI.** The model phrases results; it never
   derives them.
4. **Graceful degradation.** The application builds and runs without an OpenAI
   key.

---

## 2. Stack and versions

| Concern | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js App Router | 14.2.33 | Consider 15 after Phase 2 |
| Runtime | React | 18.3.1 | |
| Language | TypeScript | ^5.5.4 | `strict` on |
| Styling | Tailwind CSS | ^3.4.7 | Tokens in `tailwind.config.ts` |
| Database | Supabase Postgres | — | pgvector, `uuid-ossp` |
| Auth | `@supabase/ssr` | ^0.5.1 | Cookie-based |
| Client | `@supabase/supabase-js` | ^2.45.0 | |
| LLM | OpenAI Chat Completions | — | `gpt-4o-mini` default |
| Embeddings | OpenAI | — | `text-embedding-3-small`, 1536-dim |
| Hosting | Vercel | — | Auto-deploy on `main` |

No ORM, no state library, no component library, no test framework yet.

---

## 3. Identity model

The single most important thing to understand.

```
auth.users                      profiles
┌────────────┐                  ┌──────────────────┐
│ id (uuid)  │◀─────────────────│ auth_user_id     │
│ email      │                  │ id (uuid)  ◀─────┼─── all domain FKs
└────────────┘                  │ handle           │
                                │ role             │
                                └──────────────────┘
```

- `auth.users.id` — Supabase Auth. Available via `supabase.auth.getUser()`.
- `profiles.id` — the app-level identity. **Every domain table references this.**

Resolution:

| Context | Use |
|---|---|
| Server TS | `getCurrentProfile()` — `src/lib/data.ts` |
| SQL / RLS | `current_profile_id()` — `0002_rls_policies.sql` |

`getCurrentProfile()` self-heals: if an auth user exists with no profile row,
it creates one. This makes the OAuth callback path resilient.

### Roles

`profiles.role` ∈ `member | mentor | employer | enterprise_admin | admin`

Community-level roles are separate, on `community_members.role`
(`owner | moderator | member`).

---

## 4. Authorization

There is no permissions middleware. **RLS is the authorization layer.**

### Helper functions

All `SECURITY DEFINER`, `stable`, `set search_path = public`:

| Function | Returns |
|---|---|
| `current_profile_id()` | Caller's `profiles.id` |
| `is_community_member(cid)` | Active membership in community |
| `is_community_mod(cid)` | Owner or moderator |

### Access patterns

| Data | Rule |
|---|---|
| Profiles | Readable by any authenticated user; writable by self |
| Communities | Public readable by all; private/paid by members only |
| Channels, messages | Membership-scoped |
| Feed posts | Global posts open; community posts membership-scoped |
| Notifications | Recipient only |
| Personal career data | Owner only |
| `ai_sources` | Owner, or members of the scoped community |
| `ai_chunks` | **No client policy.** Server-side retrieval only |
| `analytics_events` | Write-only from server; no client read |
| `usage_counters` | Owner can read; writes only via `consume_quota()` |

### The service role

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. Used for vector retrieval,
XP awards, and quota accounting.

**It must never appear in client code or a `NEXT_PUBLIC_` variable.** It is
read only in server modules and route handlers.

---

## 5. Database schema

### 5.1 Migration history

| # | File | Contents |
|---|---|---|
| 0001 | `phase1_foundation` | profiles, communities, channels, messages, feed, notifications, XP, streaks, badges, live sessions, AI tables |
| 0002 | `rls_policies` | Helper functions + membership-scoped policies |
| 0003 | `realtime_reactions_reads_notifications` | Realtime, reactions, read receipts |
| 0004 | `mentor_clone_rag` | `ai_chunks` extensions, `match_ai_chunks` RPC |
| 0005 | `live_sessions_qa` | Live Q&A |
| 0006 | `feed_reactions_comments` | Feed engagement |
| 0007 | `networking` | Native connections + DMs |
| 0008 | `onboarding_goals` | `career_goal`, `target_roles[]`, `onboarded_at` on profiles |
| 0009 | `live_polls` | `live_polls`, `live_poll_votes` |
| 0010 | `live_chat_presence_ai_studio` | Live chat, presence, AI studio |
| 0011 | `career_graph` | **Career Intelligence foundation** (see 5.3) |
| 0012 | `saved_opportunities` | Saved-opportunity tracker |
| 0013 | `networks` | Organisations, invites, open roles; admin-only readiness, skill supply and overview functions (see 5.5) |
| 0014 | `profile_headline_company` | `headline`, `company` on profiles |
| 0015 | `profile_photos` | Public `avatars` storage bucket with per-user folder policies; `cover_url`, `location`, `website` |
| 0016 | `network_pilot` | Readiness snapshots and trend, development pathways, consented introductions (see 5.5) |
| 0017 | `billing` | `subscriptions` for Paystack plans (see 9) |

Applied in order via the Supabase SQL editor. All idempotent.

### 5.2 Core domain (0001–0010)

**Identity** — `profiles`, `push_tokens`

**Community** — `communities`, `community_members`, `community_channels`,
`channel_messages`, `message_reactions`, `channel_reads`

**Feed** — `feed_posts`, `post_reactions`, `post_comments`

**Live** — `live_sessions`, `live_questions`, `live_polls`, `live_poll_votes`

**Networking** — connections and direct messages (0007)

**Engagement** — `xp_events`, `streaks`, `badges`, `user_badges`

**Notifications** — `notifications`

**AI / RAG** — `ai_sources`, `ai_chunks` (`vector(1536)`)

**Planning** — `career_plans` (goal, horizon, summary, `steps` jsonb, status)

### 5.3 Career Graph (0011)

| Table | Purpose |
|---|---|
| `skills` | Canonical taxonomy seeded from ESCO. `embedding vector(1536)`, HNSW index |
| `role_profiles` | Target roles from ESCO occupations, ISCO-08 mapped |
| `role_required_skills` | Role → skill, with `importance` and `weight` |
| `user_skills` | Member's skills with `proficiency`, `evidence`, `confidence` |
| `career_goals` | First-class goal entity; backfilled from `profiles.career_goal` |
| `career_actions` | Action ledger powering Career Momentum |
| `career_outcomes` | Interviews, offers, promotions — with `verification` level |
| `profile_privacy` | Visibility and availability controls |
| `usage_counters` | Per-user AI quota, fixed window |
| `analytics_events` | Product instrumentation |

Plus:

- `consume_quota(...)` — atomic quota consumption, `SECURITY DEFINER`, revoked
  from `public`/`anon`/`authenticated`
- `career_activation_metrics` — view implementing the four activation metrics

### 5.4 The Career Graph is a projection

Seven conceptual node types map onto the tables above:

| Node | Backing |
|---|---|
| PERSON | `profiles`, `profile_privacy` |
| SKILLS | `skills`, `user_skills` |
| GOALS | `career_goals`, `career_plans` |
| KNOWLEDGE | `ai_sources`, `ai_chunks` |
| RELATIONSHIPS | `communities`, `community_members`, connections, `live_sessions` |
| OPPORTUNITIES | *not built — Phase 3* |
| OUTCOMES | `career_actions`, `career_outcomes` |

**There are deliberately no `career_graph_nodes` / `career_graph_edges`
tables.** Maintaining a parallel graph alongside relational tables requires
dual writes and drifts silently. Graph queries are recursive CTEs and vector
similarity over the real tables. Revisit only if traversal depth exceeds three
hops at scale.

---

### 5.5 Networks and the pilot workflow (0013, 0016)

An **organisation** (VC fund, accelerator, university, association) has admins and members. Members choose whether to share career data with it (`organization_members.share_career_data`), and can switch it off at any time.

| Table | Purpose |
|---|---|
| `organizations`, `organization_members`, `organization_invites` | Tenancy, membership and invite links |
| `organization_roles` | Roles the network is hiring for, each pointing at a `role_profiles` row |
| `org_readiness_snapshots` | One row per role, member and day: readiness band, matched and essential skill counts |
| `org_pathway_invites` | Admin invites a member to work toward a role; accepting makes it the member's active `career_goals` row |
| `org_introductions` | `proposed` > member `consented` or `declined` > `introduced` > `interviewing` > `hired`, or `closed` |

**Access model.** Admins never read member rows directly. Every admin read and every write goes through a `SECURITY DEFINER` function that first checks `is_org_admin()` (or that the caller is the member), and only ever includes members who are sharing:

- Reads: `org_overview`, `org_members_list`, `org_readiness`, `org_skill_supply`, `org_readiness_trend`, `org_readiness_movers`, `org_pipeline`, `my_network_requests`
- Writes: `create_organization`, `accept_org_invite`, `set_org_sharing`, `capture_org_readiness`, `org_invite_pathway`, `respond_pathway`, `org_propose_intro`, `respond_intro`, `org_advance_intro`

**Readiness bands** come from `org_readiness`: weighted essential-skill coverage of 75% or more is `strong` (shown as "Ready now"), 40% or more is `partial` ("Within 90 days"), otherwise `stretch` ("Developing"). No model is involved.

**Confirmed outcomes.** When an admin records `introduced`, `interviewing` or `hired`, `org_advance_intro` writes a `career_outcomes` row with `verification = 'partner_confirmed'`, which feeds `org_overview` and the member's ledger. Every step also sends a notification.

### 5.6 Storage (0015)

Bucket `avatars` is public-read, limited to 5 MB JPEG, PNG or WebP. Authenticated users may insert, update and delete only under a folder named after their `auth.uid()`. The browser crops and resizes before upload (`settings/PhotoUploader.tsx`); `savePhoto` rejects any URL outside the member's own folder.

## 6. Application structure

```
src/
├── middleware.ts                    Session refresh
├── app/
│   ├── layout.tsx                   Root layout + metadata
│   ├── globals.css
│   ├── page.tsx                     Public landing
│   ├── login/                       page, actions, PasswordField, BrandSlideshow
│   ├── onboarding/                  page, actions
│   ├── auth/callback/route.ts       OAuth exchange
│   ├── app/                         Authenticated area
│   │   ├── layout.tsx               Nav shell
│   │   ├── page.tsx                 Dashboard
│   │   ├── NotificationBell.tsx
│   │   ├── ai/                      AICoachesTab, CareerPlanTab, CoachChat,
│   │   │                            InterviewPrepTab, ResumeReviewTab
│   │   ├── communities/
│   │   │   ├── page.tsx, new/
│   │   │   ├── [slug]/              page, ChannelChat, mentor/
│   │   │   │   └── live/[sessionId]/  LiveStage, LiveRail, PollPanel,
│   │   │   │                          LiveInteractions
│   │   │   └── *-actions.ts
│   │   ├── feed/, learn/, live/, members/, networking/, settings/
│   │   └── *-actions.ts
│   └── api/ai/
│       ├── coach/route.ts
│       ├── career-plan/route.ts
│       ├── career-plan/step/route.ts
│       ├── interview/route.ts
│       ├── resume-review/route.ts
│       └── mentor/{ask,ingest}/route.ts
├── components/mentor/               AskMentorPanel, MentorWorkspace
└── lib/
    ├── ai.ts                        All model access
    ├── data.ts                      getCurrentProfile()
    ├── usage.ts                     Quota enforcement
    ├── career/gap.ts                Skill gap engine
    ├── types.ts                     Domain types (hand-written)
    ├── xp.ts
    └── supabase/{client,server,middleware}.ts
```

### Conventions

- Server Components by default; `"use client"` only for state/effects/handlers
- Mutations are Server Actions in colocated `actions.ts`
- `export const dynamic = "force-dynamic"` on session-dependent routes
- Types are hand-written and must be updated alongside schema changes

---

## 7. Data flows

### 7.1 Authentication

```
/login → Server Action → supabase.auth.signInWithPassword()
                       → cookie set
       → OAuth → /auth/callback → exchangeCodeForSession() → redirect

Every request → middleware.ts → updateSession() → refresh cookie
```

`middleware.ts` matches everything except static assets, images, and the
Sentry tunnel (`/monitoring`).

### 7.2 Read path

```
Server Component → createClient() (anon key, user cookie)
                 → query → RLS filters → render
```

### 7.3 Write path

```
Client form → Server Action → validate → write under RLS → revalidatePath()
```

### 7.4 AI request

```
POST /api/ai/*
  1. getCurrentProfile()          → 401
  2. getTier() + consumeQuota()   → 429 with Retry-After
  3. validate body                → 400
  4. AI_CONFIGURED check          → 503 or graceful fallback
  5. lib/ai.ts → OpenAI
  6. persist if applicable
  7. JSON response
```

### 7.5 Mentor Clone RAG

```
Ingest (owner/moderator only):
  text or .txt/.md/.csv (≤2MB)
    → insert ai_sources (status: processing)
    → chunkText(1000/150)
    → embed()
    → insert ai_chunks in batches of 50
    → status: ready

Ask:
  question → embed()
           → match_ai_chunks(community_id, embedding, k=6)
           → filter by similarity threshold
           → if none: honest "not covered" + route to human mentor
           → else: answer from context only, with citations
```

Retrieval runs under the service role because `ai_chunks` has no client policy.

### 7.6 Skill gap analysis

```
analyzeGap(profileId, goalId)
  → career_goals → target_role_id
  → user_skills ⋈ skills          (held)
  → role_required_skills ⋈ skills (required)
  → matched  = required ∩ held
  → gaps     = required \ held    (essential first, then weight)
  → coverage = weighted essential coverage (internal only)
  → band     = strong | partial | stretch | unknown
```

Deterministic. No model call. The LLM receives this output and narrates it.

---

## 8. AI layer

All model access is via `src/lib/ai.ts`.

| Export | Purpose |
|---|---|
| `AI_CONFIGURED` | `!!process.env.OPENAI_API_KEY` |
| `COACH_SYSTEM_PROMPT` | Career coach persona |
| `runChat(messages)` | Chat completion; friendly string on failure |
| `embed(texts)` | 1536-dim vectors; `[]` on failure |
| `chunkText(text, 1000, 150)` | Overlapping chunks |
| `askMentorClone(...)` | RAG with citations and grounded flag |

Configuration: `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_EMBED_MODEL`
(default `text-embedding-3-small`), temperature 0.5, `max_tokens` 700.

**Never call OpenAI directly from a route handler.**

### Structured output

Structured responses must use a JSON schema plus Zod validation.
`career-plan/route.ts` currently parses a regex-stripped completion with a
`try/catch` fallback. That pattern is deprecated and scheduled for refactor.

---

## 9. Quotas and monetization

`src/lib/usage.ts` + `consume_quota()`.

Fixed 24-hour window, per user, per bucket. Postgres rather than Redis
because:

- No additional vendor or failure mode
- The same counter becomes plan enforcement when billing lands
- Volume is far below where Redis matters

Trade-off: ~5–15 ms per AI call, and a blocked request still costs an
invocation. Revisit with Upstash edge middleware above roughly 50 req/s
sustained on a single route.

Buckets: `ai:coach`, `ai:career-plan`, `ai:career-plan-step`, `ai:interview`,
`ai:resume-review`, `ai:mentor-ask`, `ai:mentor-ingest`.

**Plans.** `getTier()` reads the member's `subscriptions` row. `active`, `non_renewing` and `past_due` keep the paid tier until `current_period_end`; anything else is `free`. If the table is missing it returns `free`.

| Bucket (per day) | Free | Starter | Pro |
|---|---|---|---|
| `ai:coach` | 25 | 100 | 200 |
| `ai:interview` | 5 | 20 | 50 |
| `ai:resume-review` | 3 | 12 | 30 |
| `ai:career-plan` | 3 | 10 | 25 |
| `ai:mentor-ask` | 20 | 75 | 150 |

`LIMITS` in `src/lib/usage.ts` is the single source for these numbers; the plans and billing pages read it directly.

**Billing (0017).** Paystack, KES, monthly card subscriptions (Starter KES 13,000, Pro KES 26,000; Custom is sales-led).

1. `startCheckout` (server action) initialises a Paystack transaction with the plan code and `metadata.profile_id`, writes a `pending` row, and redirects to Paystack.
2. `/app/billing/callback` verifies the transaction server-side and activates the plan only if the metadata matches the signed-in member.
3. `/api/paystack/webhook` verifies the HMAC-SHA512 signature (constant-time) and syncs `charge.success`, `subscription.create`, `subscription.not_renew`, `subscription.disable` and `invoice.payment_failed`.
4. `subscriptions` has no insert or update policy: only the service role writes billing state.

Without the `PAYSTACK_*` variables, upgrade buttons record a `pro_interest` analytics event instead of charging. Member and role caps per plan are product terms and are not yet enforced.

Fails **open** on infrastructure error, with logging. A broken quota table
should reduce the cost ceiling, not take the product down.

---

## 10. External integrations

| Service | Use | Auth | Status |
|---|---|---|---|
| Supabase | Database, auth, realtime, storage | Keys | Live |
| OpenAI | Chat + embeddings | API key | Live, optional |
| ESCO v1.2 | Skills + occupations taxonomy | None | Live (`scripts/seed-esco.mjs` or SQL import) |
| Greenhouse / Lever / Ashby / SmartRecruiters | Public job boards | None | Planned — Phase 3 |
| Paystack | Subscriptions in KES (cards) | Secret key + signed webhook | Live (test mode until the business is registered) |
| Supabase Storage | Profile photos and covers | RLS on `storage.objects` | Live |
| LinkedIn | — | — | **Prohibited** |

### On LinkedIn

The Connections API returns only 1st-degree connections, requires Partner
Program approval, and per Microsoft's documentation *"2nd-degree connections
are not available from LinkedIn."* The API Terms separately forbid accessing a
member's network without express permission.

No feature may assume an imported LinkedIn graph. Network signals derive from
shared community membership, shared live sessions, and native connections.

---

## 11. Metrics

`career_activation_metrics` implements four measures:

| Metric | Definition |
|---|---|
| Career activation | Has a career goal and a plan |
| Network activation | Contacted a mentor, joined a community, or requested an intro |
| Career action (7d) | Completed a meaningful action within 7 days of signup |
| Career outcome (90d) | Recorded a measurable outcome within 90 days |

Defined once in SQL so product dashboards and investor materials cannot drift.

`analytics_events` captures the event stream behind them.

---

## 12. Deployment

Vercel, auto-deploy from `main`. Framework preset auto-detected.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # server only
NEXT_PUBLIC_APP_URL
OPENAI_API_KEY                 # optional
OPENAI_MODEL                   # optional
OPENAI_EMBED_MODEL             # optional
```

Migrations are applied manually in the Supabase SQL editor, in order. Moving to
the Supabase CLI with linked environments is tracked work.

---

## 13. Known technical debt

Detail and remediation in `SECURITY-AUDIT.md`. Status as of 10 October 2026.

| Issue | Status |
|---|---|
| Ingestion embeds on the request path | Open |
| RAG similarity threshold | Fixed: raised from `0.2` (see `lib/ai.ts`) |
| No `error.tsx` / `loading.tsx` / `not-found.tsx` | Fixed: app and root boundaries plus per-route loading states |
| No security headers | Fixed: HSTS, frame, referrer and permissions headers; CSP in report-only |
| No tests, no CI | Open |
| Plan caps (members, roles) not enforced | Open |
| Hand-written types | Open: drift risk against schema; generate from Supabase next |
| Manual migrations | Open: no linked environments or rollback |
| Next.js 14 | Upgrade to 15 when the pilot is stable |

---

## 14. Architectural decisions

| Decision | Rationale | Revisit when |
|---|---|---|
| No ORM | Supabase client is sufficient; RLS is the boundary | Query complexity outgrows it |
| RLS as authorization | Cannot be bypassed by a forgotten check | Never |
| Postgres quotas, not Redis | No new vendor; doubles as billing | >50 req/s on one route |
| Graph as projection | Avoids dual-write drift | Traversal beyond 3 hops at scale |
| Bands, not percentages | Honest about calibration | Never |
| Deterministic gap logic | Hallucinated gaps are actioned by users | Never |
| ESCO over custom taxonomy | 13,485 concepts, multilingual, open licence | Coverage gaps in target market |
| Public ATS feeds | Legal, free, intended for redistribution | Partner feeds become available |
| Server Components default | Less client JS, simpler data flow | — |
