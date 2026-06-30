# ASCENDR

**The Global AI Career Growth Ecosystem** — a single platform where professionals, students, founders, executives, and organizations learn, connect, grow, and succeed across the full arc of a career.

> Accelerate Your Career with AI and World-Class Mentors.

This repository is **fully independent** from any prior project (MentorBay). It has its own GitHub repo, its own Vercel deployment, and its own Supabase database.

---

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — themed with the ASCENDR Stage 1 design tokens (`tailwind.config.ts`)
- **Supabase** (Postgres + Auth + RLS + Storage; `pgvector` for AI)
- **Vercel** hosting

## Project structure

```
src/
  app/                 # Next.js App Router (layout, globals, home page)
  lib/supabase/        # Browser + server Supabase clients
supabase/
  migrations/          # SQL schema (0001 = Phase 1 foundation, from the PRD ERD)
docs/                  # PRD, UI/UX design spec
public/
  prototype/           # The P1 high-fidelity clickable prototype (open prototype.html)
```

## Documentation

- `docs/ASCENDR_Global_Product_Strategy_Master_PRD.md` — the full 25-section master PRD
- `docs/ASCENDR_UIUX_Master_Design_Spec.md` — Stages 1–4 (design system, IA, screen inventory, wireframes)
- `public/prototype/prototype.html` — the five P1 high-fidelity screens (open in a browser)

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then fill in your NEW Supabase project values

# 3. Run the database migration
#    (Supabase dashboard -> SQL Editor -> paste supabase/migrations/0001_phase1_foundation.sql)
#    or use the Supabase CLI

# 4. Start the dev server
npm run dev
```

---

## Deployment — connect Vercel + Supabase (one-time)

### 1. Create a new Supabase project (independent database)
1. Go to https://supabase.com → **New project** (use a new project name, e.g. `ascendr-prod`).
2. Wait for it to provision, then open **Project Settings → API**.
3. Copy: `Project URL`, `anon public` key, and `service_role` key.
4. Open **SQL Editor**, paste the contents of `supabase/migrations/0001_phase1_foundation.sql`, and run it.

### 2. Create a new Vercel project (independent hosting)
1. Go to https://vercel.com → **Add New → Project**.
2. Import the GitHub repo **moselanto/ascendr**.
3. Framework preset: **Next.js** (auto-detected).
4. Add Environment Variables (from your Supabase keys above):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain)
5. Click **Deploy**.

That's it — every push to `main` now auto-deploys to Vercel, backed by your independent Supabase database.

---

## Roadmap

Build sequence follows the Master PRD (Section 18). **Phase 1** = retention engine (communities, chat, notifications, gamification, feed) + the AI wedge (Career Coach + Mentor Clone) + live Q&A. The `0001` migration already lays down the Phase 1 schema.

*Rise. Learn. Connect. Lead.*
