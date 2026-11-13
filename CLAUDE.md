# CLAUDE.md — DischargeIQ (working title)

Read this file first in every session. Then read the files in `docs/` before planning any work.

> **First session only:** before any code, read `docs/consult-claude-code.md` and give your honest
> expert opinion on every proposed decision there, as a senior developer specialising in UK healthcare,
> NHS digital standards and community pharmacy. Agree, disagree or suggest something better, with reasons.
> The owner makes the final call; record outcomes in `docs/decisions.md`.

## What we're building
A web app that helps community pharmacy teams handle **NHS Discharge Medicines Service (DMS)** referrals,
from the safety check through to a claim-ready record.
1. The pharmacist enters the patient's pre-admission medicines (from the PMR) and the hospital discharge letter.
2. **AI extracts** the medicines from the letter; **plain deterministic code compares** the two lists and shows
   what was STARTED / STOPPED / CHANGED / UNCHANGED, with each line linked to the exact sentence in the letter.
3. Each case moves through the **three DMS stages** (stage 2 re-uses the same comparison engine to check the first
   new prescription against the discharge list), with autosave, and ends with a **claim-ready record**.
A pharmacist always reviews and approves. The app supports a decision; it never makes one.

**Why it matters (user research):** comparison takes 15–20 min per referral and disrupts other work; one
pharmacist submits zero DMS claims (worth up to £35 each) because the claim process is too convoluted.

This is a 3-week individual bootcamp project (TFS – Vibe Coding Web App, Route A) aiming for the top 5,
with ambition to grow into a real product later. Build like it's production: clean, tested, explainable.

## The owner
Career changer: former community pharmacist, now NHS + data analysis (CompTIA Data+), GCP basics,
cyber security fundamentals, 10-week software bootcamp (HTML, CSS, APIs; **very little JavaScript and
new to TypeScript**). **The owner must be able to explain every part of the code in Q&A.** Teach as you build:
keep TypeScript simple (no clever generics or advanced type tricks), and explain any type you introduce.
Likely presentation format: 5 minutes + 2 minutes of questions from a panel of software engineers.

## Golden rules (non-negotiable)
1. **No real patient data, ever.** Synthetic demo letters only. Never invent real NHS numbers (use the 999 test range).
2. **Secrets only in `.env`** (never committed; `.env.example` lists names only). The frontend never sees an API key.
3. **AI reads, code compares, pharmacist approves.** AI output never decides a clinical change on its own.
4. **No AI-generated clinical advice.** No dose suggestions, no "switch to X". Signpost to pharmacist/prescriber.
5. **Validate every AI response** with a Zod schema before using it. Fail gracefully if invalid.
6. **Small commits**, clear messages (`feat:`, `fix:`, `test:`, `docs:`). Keep `main` deployable.
7. **After every feature:** explain in plain English what you built, why, and the alternatives,
   then add an entry to `docs/decisions.md`.
8. **Plan before code.** For any non-trivial task, propose a plan and wait for approval.
9. **Tests for logic.** The reconciliation (diff) engine and auth must have unit tests.
10. **Ask, don't assume,** when a clinical or product decision is unclear. Check `docs/` first.

## Tech stack (proposed — review in the first session, see `docs/consult-claude-code.md`)
- **Language:** **TypeScript** everywhere (strict mode), kept beginner-readable
- **Frontend:** React + Vite + TypeScript, React Router, plain CSS with design tokens (mobile-first, responsive)
- **Backend:** Node.js + Express + TypeScript, REST JSON API under `/api`, layered (routes → controllers → services → db)
- **Shared:** Zod schemas in a `shared/` folder used by both client and server; types inferred with `z.infer`
- **Database:** **Supabase** (managed PostgreSQL, London region) accessed **only by our Express API**;
  versioned SQL migrations; Supabase Storage for uploaded letters (Tier 2)
- **Auth:** our own — bcrypt password hashing + JWT in an httpOnly cookie, role-based access (pharmacist, admin).
  Not Supabase Auth (we want to own and explain it; production would use NHS CIS2)
- **AI:** Anthropic Claude API, called **only from the backend**; model name set via env var
- **Validation:** Zod (request bodies and AI responses)
- **Testing:** Vitest + Supertest (API), Playwright for one end-to-end journey (Tier 3)
- **Hosting:** Frontend on Vercel/Netlify, API on Render (or Google Cloud Run as stretch), DB on Supabase
- **CI/CD (from day one):** GitHub Actions runs type-check, lint, tests and build on every push/PR;
  hosts auto-deploy from `main` with preview deploys for PRs; Dependabot + secret scanning on

## Folder structure (target)
```
/shared            Zod schemas + inferred types used by client and server
/client            React app
  /src/pages       one file per page
  /src/components  reusable UI
  /src/api         fetch wrappers for our API
  /src/styles      tokens.css + global styles
/server            Express API
  /routes          route definitions
  /controllers     request handling
  /services        business logic (ai.service, reconcile.service, highrisk.service, dms.service, claim.service)
  /validators      Zod schemas
  /middleware      auth, error handler, rate limit
  /db              connection, migrations, seed (synthetic data only)
  /tests
/docs              brief, architecture, decisions, user research
```

## Build tiers (finish and deploy each tier before starting the next)
- **Tier 1 – Foundation:** CI/CD pipeline, auth + roles, cases & medicines CRUD, paste letter → AI extraction
  → diff view, DMS stage tracker (3 stages, 72-hour stage 1 target) with autosave, responsive layout, deployed live.
- **Tier 2 – Differentiators:** stage 2 re-check (new prescription vs discharge list, same engine),
  claim-ready summary, PDF/photo upload (Claude vision + Supabase Storage), click-to-source traceability,
  dm+d code matching, rule-based high-risk flags, letter-vs-list discrepancy alerts, audit log.
- **Tier 3 – Polish:** claims & stats dashboard (claims ready, value, unclaimed), Swagger API docs,
  FHIR (UK Core) export of a reconciliation, error monitoring, telemetry bar, redaction demo,
  accessibility pass, Playwright E2E. **Feature freeze ~5 days before the deadline** (time to rehearse).

## Skills (use these, don't wait for auto-triggering)
- **After every feature:** use `explain-and-log` (plain-English explanation + `docs/decisions.md` entry).
- **Any UI or styling work:** use `dischargeiq-design` together with `frontend-design`.
  Follow `docs/design-system.md` once it exists.
- **Browser testing (Tier 3):** use `webapp-testing`.
- **Before installing any third-party skill, plugin or MCP server:** use `skill-safety-check`.
- **Planning a new project or big feature:** use `grill-plan`.

## Key docs
- `docs/brief.md` — product brief (Route A, needs tutor approval)
- `docs/architecture.md` — data model, endpoints, security, risks
- `docs/decisions.md` — decision log (append only)
- `docs/user-research.md` — pharmacist questionnaire + findings
- `docs/consult-claude-code.md` — proposed decisions awaiting your expert review (first session)

## Commands (fill in once the project is scaffolded)
- `npm run dev` —
- `npm test` —
- `npm run migrate` —
- `npm run seed` —
