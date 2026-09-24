# AGENTS.md

Operating instructions for AI coding agents working in this repository.
Humans should read `ARCHITECTURE-ESSENTIALS.md` first; this file assumes it.

Last updated: 2026-09-24

---

## 1. What this product is

ASCENDR is a **career intelligence platform**. It is not a mentorship
marketplace, a course platform, a job board, or a chatbot wrapper.

The product answers five questions for a member:

1. Where am I now?
2. Where do I want to go?
3. What am I missing?
4. Who can help me?
5. What should I do next?

Every feature must serve one of those. If a proposed change does not, say so
rather than building it.

---

## 2. Non-negotiable rules

These exist because violating them has a cost that is not obvious at review
time. Do not break them without an explicit human decision recorded in the PR.

### 2.1 Never compute product logic in the LLM

Skill gaps, match bands, recommendation ordering, and quota decisions are
computed in TypeScript or SQL. The model **narrates** results; it never
**derives** them.

A hallucinated skill gap is worse than no gap analysis, because the user cannot
tell the difference and will act on it. See `src/lib/career/gap.ts` — that
function is deterministic by design, and must stay that way.

### 2.2 Never surface a match percentage

Use bands: `strong` / `partial` / `stretch` / `unknown`.

A "87% match" claims a calibration this system does not have. `coverage`
(0..1) exists for internal ranking only and must not reach the UI.

### 2.3 Every recommendation carries its reasons

Any recommended person, opportunity, community, or action must ship with
human-readable reasons traceable to database rows. No reasons, no card.

### 2.4 All AI routes consume quota

Every route under `src/app/api/ai/` calls `consumeQuota()` before any OpenAI
call. No exceptions. An unmetered AI route is an open funding line to whoever
finds it.

### 2.5 Never expose `ai_chunks` to clients

Retrieval runs server-side under the service role. There is deliberately no
RLS policy on that table. Adding one breaks per-mentor source isolation.

### 2.6 Never claim a LinkedIn-derived network

LinkedIn's API does not permit reading a member's connection graph, and
2nd-degree connections are not available at any partner tier. Do not write
code, copy, or schema that assumes otherwise. "Network" in this product means
shared communities, shared live sessions, and native connections.

### 2.7 No fabricated social proof

Do not add testimonials, user counts, country counts, or trust badges that are
not backed by real data. This has already had to be removed once.

---

## 3. Codebase conventions

### 3.1 Identity — the most common mistake

There are **two** user identifiers and they are not interchangeable:

| Identifier | What it is | Where it comes from |
|---|---|---|
| `auth.users.id` | Supabase auth user | `supabase.auth.getUser()` |
| `profiles.id` | App-level identity | `getCurrentProfile()` |

**Every domain table foreign-keys to `profiles.id`, never to `auth.users.id`.**

In server code, resolve with `getCurrentProfile()` from `src/lib/data.ts`.
In SQL and RLS policies, resolve with `current_profile_id()`.

### 3.2 RLS

Policies live in numbered migrations and follow the helpers established in
`0002_rls_policies.sql`:

- `current_profile_id()` — caller's profile id
- `is_community_member(cid)` — active membership check
- `is_community_mod(cid)` — owner or moderator check

All three are `SECURITY DEFINER` with `set search_path = public`. When adding a
helper, match that shape or policies will behave inconsistently under RLS.

Default posture for new personal-data tables:

```sql
alter table <t> enable row level security;

create policy "<t>_read_own" on <t>
  for select using (user_id = current_profile_id());
create policy "<t>_write_own" on <t>
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id());
```

### 3.3 Migrations

- Sequential, zero-padded, never edited once merged: `0012_<topic>.sql`
- Idempotent (`if not exists`, `on conflict do nothing`) — they are applied by
  hand in the Supabase SQL editor and get re-run
- Additive by default. A destructive change needs its own PR and a stated
  rollback
- Backfill existing rows so live users never land in an empty state
- Update the migration table in `ARCHITECTURE.md` in the same PR

### 3.4 Data access

- Server Components and Server Actions are the default. Reach for a route
  handler only when you need a non-GET HTTP endpoint (the AI routes)
- Use `createClient()` from `src/lib/supabase/server.ts` in server code, and
  from `src/lib/supabase/client.ts` in `"use client"` components
- Mutations are Server Actions in `actions.ts` files, colocated with the route
  that uses them
- `export const dynamic = "force-dynamic"` on anything reading session state

### 3.5 Files and naming

```
src/app/<route>/page.tsx        Server Component
src/app/<route>/actions.ts      Server Actions
src/app/<route>/<Thing>.tsx     Client Component, PascalCase
src/lib/<domain>/<thing>.ts     Shared logic, camelCase
supabase/migrations/NNNN_*.sql  Schema
```

Client components are the exception, not the default. Add `"use client"` only
when you need state, effects, or event handlers.

### 3.6 Types

`src/lib/types.ts` holds hand-written domain types. They are not generated, so
**when you change a table, update the type in the same PR.** A drifted type is
silent until it reaches production.

---

## 4. Working with the AI layer

All model access goes through `src/lib/ai.ts`. Do not call the OpenAI API
directly from a route.

- `runChat(messages)` — chat completion, returns a friendly string on failure
- `embed(texts)` — returns 1536-dim vectors, `[]` on failure
- `chunkText(text)` — ~1000 chars, 150 overlap
- `askMentorClone(...)` — RAG with citations

`AI_CONFIGURED` is false when `OPENAI_API_KEY` is absent. **Every AI feature
must degrade gracefully in that state** — the app builds and runs without a
key, and that property must be preserved.

### Structured output

When you need structured data, request it with a JSON schema and validate with
Zod before use. Do not `JSON.parse` a raw completion and hope.
`src/app/api/ai/career-plan/route.ts` currently does this the fragile way and
is scheduled for refactor — do not copy that pattern.

### Adding an AI route

```ts
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = await getTier(profile.id);
  const quota = await consumeQuota(profile.id, "ai:<bucket>", tier);
  if (!quota.allowed) return quotaExceededResponse(quota, "ai:<bucket>");

  // ... validate input, then call lib/ai
}
```

Register the new bucket in the `LIMITS` map in `src/lib/usage.ts`.

---

## 5. External data sources

| Source | Status | Notes |
|---|---|---|
| ESCO | Approved | Skills + occupations taxonomy. Open API, no key. EUPL 1.2 |
| Greenhouse / Lever / Ashby / SmartRecruiters | Approved | Public keyless job board JSON, intended for redistribution |
| OpenAI | Approved | `gpt-4o-mini`, `text-embedding-3-small` |
| LinkedIn | **Prohibited** | Connection graph not accessible. See 2.6 |
| Scraping job boards | **Prohibited** | Legally fraught, operationally brittle |

Adding a new external dependency requires a human decision. Raise it, don't
install it.

---

## 6. Definition of done

A change is complete when:

- [ ] `npm run build` and `npm run lint` pass
- [ ] RLS policies exist for any new table holding user data
- [ ] Types in `src/lib/types.ts` match the schema
- [ ] New AI routes consume quota
- [ ] Loading, empty, and error states exist for new UI
- [ ] Mobile (390×844) is composed, not just shrunk
- [ ] No secrets, no `service_role` key reachable from client code
- [ ] `ARCHITECTURE.md` updated if schema, routes, or dependencies changed
- [ ] Recommendations ship with reasons

---

## 7. Where to be careful

**`src/lib/supabase/middleware.ts`** — session refresh runs on nearly every
request. Breaking it logs everyone out.

**`src/app/api/ai/mentor/ingest/route.ts`** — chunks and embeds inline on the
request path. Large sources time out and strand `ai_sources.status` at
`processing`. Known issue, documented in `SECURITY-AUDIT.md`. Don't add work
to this path.

**`match_ai_chunks` similarity threshold** — currently `0.2`, which is loose
enough to pass irrelevant chunks as grounded. Raising it is tracked work; if
you touch retrieval, read `SECURITY-AUDIT.md` first.

**`src/app/page.tsx`** — ~19 KB single file. Extract components when you touch
it, but don't do a drive-by rewrite in an unrelated PR.

---

## 8. Scope discipline

The product strategy explicitly warns against building many screens before
validating the core. Current build order is in `PRD.md` §8 and is enforced.

**Do not build** B2B dashboards, VC portfolio views, university admin, or
enterprise features until the `organizations` table exists and a named design
partner is signed. These are real products with real buyers; they are not
unlocked by adding a route.

When in doubt, build the smaller thing and ask.
