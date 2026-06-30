# ASCENDR — Global Product Strategy & Master PRD (GPS + PRD)

> The full master PRD is maintained as a living Town document and mirrored here for the codebase.
> Source of truth: ASCENDR Global Product Strategy & Master Product Requirements Document, Version 1.0.

**The Global AI Career Growth Ecosystem** — Accelerate Your Career with AI and World-Class Mentors.

This document is the single source of truth for product, engineering, design, investors, and partners. It contains 25 sections: Executive Summary; Vision, Mission & Values; Global Market Analysis; Competitive Landscape; Product Strategy; Business Model; Personas; Enterprise Strategy; AI Strategy; 210+ Functional Requirements; UX/UI Design System; Wireframes; System Architecture; Database Design (ERD); API Specifications; Security & Compliance; Technology Stack; Development Roadmap; Revenue & Pricing; Go-to-Market; Marketing; Financial Projections; Investor Pitch Material; Product Roadmap (3–5 yrs); Implementation Plan.

## Key build references for this repo

- **Tech stack:** Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + RLS + Auth + Storage, pgvector) + Vercel.
- **Phase 1 (retention engine + AI wedge):** Communities, Channels & Group Chat, Notifications, Gamification (XP/streaks/leaderboards), Feed, AI Career Coach + AI Mentor Clone (RAG), Live Sessions + Q&A.
- **Phase 1 schema** lives in `supabase/migrations/0001_phase1_foundation.sql`.
- **Design system** (colors, Inter, 8px grid, components) is wired into `tailwind.config.ts` and `src/app/globals.css`; full spec in `docs/ASCENDR_UIUX_Master_Design_Spec.md`.
- **Clickable P1 prototype:** `public/prototype/prototype.html`.

The complete narrative PRD (all 25 sections in full) is kept in the Town document and can be exported here on request.
