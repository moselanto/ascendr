# SECURITY-AUDIT.md

ASCENDR — Security and reliability audit

Audit date: 2026-09-24
Scope: `moselanto/ascendr` @ `main` (tree `eed476f`) and the Vercel deployment
Method: source review of schema, RLS policies, middleware, AI routes, auth
flows and configuration. **No dynamic testing or penetration testing was
performed.**

---

## Summary

| Severity | Count | Status |
|---|---|---|
| Critical | 1 | Open |
| High | 3 | 1 mitigated, 2 open |
| Medium | 6 | Open |
| Low | 5 | Open |

The application's authorization model is genuinely good. RLS is enabled on
every sensitive table, policies are centralised behind `SECURITY DEFINER`
helpers rather than duplicated, and `ai_chunks` is deliberately left
unexposed to enforce per-mentor isolation. That is better than most projects
at this stage.

The problems are concentrated in **cost exposure, operational resilience and
transport hardening** rather than in data access.

---

## Critical

### C-1 — AI endpoints are unmetered

**Status:** Mitigation written, not yet deployed
**Affected:** all routes under `src/app/api/ai/`

Every AI route authenticates the caller and then performs unbounded OpenAI
work. There is no per-user limit, no global limit, and no spend ceiling.

```ts
// api/ai/coach/route.ts — auth is the only gate
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// → straight to runChat()
```

Registration is open, so the cost of obtaining a valid session is zero. A
single scripted account can loop `/api/ai/coach` indefinitely. The most
expensive path is `/api/ai/mentor/ingest`, which accepts 2 MB of text and
embeds all of it — roughly 500 chunks per request, repeatable.

There is no billing alert configured and no usage telemetry, so the first
signal would be the OpenAI invoice.

**Impact:** unbounded financial loss; potential OpenAI quota exhaustion taking
all AI features down for every user.

**Remediation:** `usage_counters` + `consume_quota()` in
`supabase/migrations/0011_career_graph.sql`, wrapped by `src/lib/usage.ts`.
Every AI route must call `consumeQuota()` before any model call. Also set a
hard monthly spend cap in the OpenAI dashboard as a backstop — application
logic is not a substitute for a provider-side limit.

---

## High

### H-1 — Ingestion runs on the request path

**Status:** Open
**Affected:** `src/app/api/ai/mentor/ingest/route.ts`

Chunking, embedding and batch insertion happen synchronously inside the HTTP
request. A 2 MB source produces ~500 chunks and an equal number of embedding
inputs. On Vercel's default function timeout this will not complete.

On timeout or partial failure the `ai_sources` row is left at
`status: 'processing'` permanently, with orphaned `ai_chunks` already
committed. There is no retry, no cleanup and no way for the mentor to recover
except by re-uploading, which duplicates the chunks that did land.

Note the existing error path also mislabels state:

```ts
if (vectors.length !== chunks.length) {
  await supabase.from("ai_sources").update({ status: "processing" })  // already 'processing'
```

**Impact:** silent data corruption in the RAG corpus; duplicated chunks skew
retrieval; mentor-facing feature appears broken with no diagnostic.

**Remediation:** move to a background job. Add `status: 'failed'` and an
`error` column, make ingestion resumable by `chunk_index`, and delete orphaned
chunks on retry. Short term, cap accepted input well below the timeout and set
`status: 'failed'` on the error path.

### H-2 — Retrieval threshold admits weak matches as grounded

**Status:** Open
**Affected:** `src/lib/ai.ts` → `askMentorClone()`

```ts
const relevant = chunks.filter((c) => c.similarity > 0.2);
```

For `text-embedding-3-small`, cosine similarity of 0.2 is close to unrelated
text. Chunks that pass this filter are presented to the user as cited,
source-grounded answers from a named mentor.

This is a **trust** vulnerability rather than a data one, and it attacks the
product's core differentiator: the claim that mentor clone answers are
grounded in the mentor's real content. A confidently wrong citation
attributed to a named expert is worse than returning nothing, and it carries
reputational risk for that expert.

**Impact:** fabricated-seeming attributions to real, named people.

**Remediation:** raise to 0.35–0.45 and tune against a labelled set. Return
the honest "not covered in this mentor's content" path more readily — it
already exists and is well written. Consider surfacing similarity to the
mentor in their own studio view.

### H-3 — No security headers

**Status:** Open
**Affected:** `next.config.mjs`

```js
const nextConfig = { reactStrictMode: true };
```

No Content-Security-Policy, `Strict-Transport-Security`, `X-Frame-Options` /
`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` or
`Permissions-Policy`.

The application renders user-authored content — channel messages, feed posts,
comments, DMs, mentor-uploaded sources. React escapes by default, which is the
main mitigation, but there is no defence in depth if any path introduces
`dangerouslySetInnerHTML` (note that Greenhouse job descriptions arrive as raw
HTML in Phase 3 — that is exactly such a path).

Absent `frame-ancestors`, the authenticated app can be framed, enabling
clickjacking against destructive actions.

**Impact:** clickjacking; no containment if an XSS sink is ever introduced.

**Remediation:** add a `headers()` block. Start CSP in `Report-Only`,
particularly given Supabase Realtime's WebSocket connections.

---

## Medium

### M-1 — No error boundaries

No `error.tsx`, `loading.tsx` or `not-found.tsx` anywhere in `src/app`. Any
throw in a Server Component produces an unstyled failure page. Beyond UX, the
default error surface can leak stack details depending on configuration.

**Remediation:** add boundaries at the root and at `/app`. Generic messages;
log detail server-side.

### M-2 — No monitoring or alerting

No Sentry, no analytics, no logging pipeline. `console.error` in
`src/lib/ai.ts` goes to Vercel logs and is never read.

Security consequence: abuse, credential stuffing against `/login`, and the
cost exposure in C-1 are all invisible until they are expensive.

**Remediation:** Sentry plus product analytics. `analytics_events` in 0011
provides the substrate.

### M-3 — No rate limiting on authentication

`/login` Server Actions have no throttling beyond Supabase's own defaults.
Credential stuffing and user enumeration are unmitigated at the application
layer.

**Remediation:** IP-based throttling on auth actions; verify Supabase Auth
rate limits are enabled in project settings.

### M-4 — Ingestion accepts unvalidated content

File type is checked by **filename extension only** and content is read as
text without inspection. A file named `.txt` containing anything at all is
chunked, embedded and stored, then later returned to users as mentor-grounded
content.

This is a prompt-injection vector: text in an ingested source is concatenated
into the context sent to the model. Content ingested by a community
owner/moderator can therefore attempt to steer the mentor clone's behaviour
for every member of that community.

Mitigating factors: ingestion requires owner/moderator role, and the system
prompt constrains the model to the provided context. Neither is a robust
defence against injection.

**Remediation:** validate content type by inspection, not extension. Delimit
retrieved context explicitly and instruct the model to treat it as data, never
as instructions. Consider flagging sources containing instruction-like
patterns for review.

### M-5 — No CSRF hardening documented

Next.js Server Actions have built-in CSRF protections, and Supabase cookies
should be `SameSite=Lax`. Neither was verified during this review, and
`src/lib/supabase/middleware.ts` sets cookies without explicit attributes.

**Remediation:** verify cookie attributes in the running app; document the
expectation.

### M-6 — Manual migrations, no environment separation

Migrations are applied by hand in the Supabase SQL editor against what appears
to be a single project. There is no staging environment, no linked CLI
workflow, and no rollback procedure. The README documents through `0009` while
`0010` exists — documentation has already drifted from reality.

A mistaken policy change is applied directly to production data.

**Remediation:** Supabase CLI with linked environments, staging project,
migrations in CI.

---

## Low

### L-1 — No dependency scanning
No Dependabot, no `npm audit` in CI, no lockfile policy. Five runtime
dependencies keeps exposure small, but nothing would surface a known CVE.

### L-2 — No tests, no CI
Nothing prevents a broken build, a dropped RLS policy or a regression in the
quota path from reaching `main`. RLS policies in particular are exactly the
kind of logic that needs tests, because failures are silent.

### L-3 — Service-role key breadth
`SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS and is present in the same
environment as all route handlers. It is correctly server-only today, but one
careless import into a client component would expose it. Consider narrowing to
dedicated Postgres functions where feasible.

### L-4 — No account lockout or MFA
Supabase defaults only. For a product intended to hold career history and
professional network data, MFA should be on the roadmap.

### L-5 — Public prototype directory
`public/prototype/` (68 KB of HTML) is excluded from middleware and served
publicly. It is presumably intentional, but it is unversioned design material
on the production domain and should be confirmed or removed.

---

## Positive findings

Worth recording, because these are frequently done badly and are done well
here.

1. **RLS on every sensitive table**, with policies centralised behind
   `current_profile_id()`, `is_community_member()` and `is_community_mod()`
   rather than duplicated per policy. This prevents the drift that causes most
   RLS failures.
2. **`ai_chunks` intentionally has no client policy**, with the reasoning
   documented in the migration. Retrieval runs server-side only. This is a
   deliberate, correct isolation decision.
3. **XP has no client insert policy** — awards are server-side only, closing
   the obvious gamification-inflation path.
4. **Secrets are correctly scoped.** No `NEXT_PUBLIC_` prefix on the service
   role key; `.env.example` is present and `.gitignore` covers `.env.local`.
5. **Graceful AI degradation.** `AI_CONFIGURED` means a missing key produces a
   clear message rather than a crash or a leaked error.
6. **Ingestion authorization is correct** — owner/moderator membership is
   verified against `community_members` before any write.
7. **Bounded chat history** (`slice(-12)`) limits prompt growth.
8. **The mentor clone refuses to answer ungrounded questions** and routes to a
   human. The right default, undermined only by H-2's threshold.

---

## Non-security finding: unverifiable public claims

Not a vulnerability, but a liability, recorded here because it needs an owner.

The live homepage states *"Trusted by learners in 40+ countries"*, a
40+/24/7/100% statistics bar, and three named testimonials (Aisha O., David
M., Grace N.). These appear to be placeholder content presented as fact.

In several jurisdictions unsubstantiated testimonials and performance claims
in advertising carry regulatory exposure. Independently, discovery of
fabricated social proof during investor or partner diligence is materially
damaging.

**Remediation:** remove, or reframe as illustrative, before any traffic or
fundraising push.

---

## Remediation priority

| Order | Item | Severity | Effort |
|---|---|---|---|
| 1 | C-1 quotas + OpenAI spend cap | Critical | Written; wire into routes |
| 2 | H-2 retrieval threshold | High | Hours |
| 3 | H-3 security headers | High | Hours |
| 4 | M-1 error boundaries | Medium | Hours |
| 5 | M-2 Sentry + analytics | Medium | ~1 day |
| 6 | H-1 async ingestion | High | 2–3 days |
| 7 | M-4 ingestion validation | Medium | 1–2 days |
| 8 | M-3 auth throttling | Medium | ~1 day |
| 9 | M-6 migration workflow | Medium | 2–3 days |
| 10 | L-1, L-2 CI and scanning | Low | 2–3 days |

Items 1–5 constitute Phase 0 in `PRD.md` and should complete before any
marketing or fundraising activity drives traffic.

---

## Re-audit triggers

Repeat this audit when any of the following ships:

- `organizations` and org-scoped RLS (Phase 5) — a new tenancy boundary is the
  highest-risk change on the roadmap
- Stripe and `subscriptions` (Phase 6) — payment data
- Opportunity ingestion (Phase 3) — third-party HTML entering the render path
- Any change to `src/lib/supabase/middleware.ts` or the policy set
- Any new `dangerouslySetInnerHTML`
