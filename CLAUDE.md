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
Brief approved (Route A). Presentation: **Thu 19 Nov, afternoon panel of software engineers: 5 min + 2 min questions.**
The demo shows a polished prototype, then explains how it would work in a real NHS pharmacy setting.

## Timeline (overrides any dates in course files)
**Ignore all course calendar dates and week numbers in the TFS files, lesson plans or README templates.**
The owner's timeline: planning started 3 Nov 2026. **Submission deadline: Wed 18 Nov 2026, 09:00**
(target: submit by 08:30). **Feature freeze: Tue 17 Nov, 22:00.** After the freeze: testing, fixes and
handover docs only. Wed 06:00–08:30: final checks only, no new features. Work fast, but **never rush
security or testing.** Follow the sprint plan below.

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
11. **Designs before code.** Desktop and mobile layouts for every page go in `docs/designs/` and are committed
    before any app code (it's a marking requirement; git history is the proof).
12. **Users can only see and change their own data.** Check ownership on every case/medicine route (test it).
13. **Errors show no details to users.** Central error handler: friendly message + status code; details only
    in server logs. No stack traces, SQL or library errors in responses.
14. **Collect only what's needed.** No real names, addresses or NHS numbers. Minimal user fields.
15. **Never put a secret in a `VITE_` variable** (those are public in the browser). No `localhost` URLs in code;
    use env vars.
16. **Keep the handover docs current:** add to `docs/ai-usage-log.md` when an AI suggestion mattered or was
    rejected; tick `docs/requirements-checklist.md` as items are met.

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

## Sprint plan (Mon 16 Nov → Wed 18 Nov 08:30). Deploy early, commit small and often.
- **Phase 0, Mon afternoon (~2h): decide and design**
  1. Review `docs/consult-claude-code.md` (**timebox 30–45 min**; short answers; owner decides).
  2. `dischargeiq-design`: pick a direction → `docs/design-system.md`.
  3. Desktop + mobile layouts for all 8 pages → `docs/designs/` → **commit before any code**.
- **Phase 1, Mon evening: foundation + go live early**
  Scaffold monorepo (shared/client/server), CI on GitHub Actions, `.env.example`, Supabase DB + migrations,
  deploy a "hello world" to Vercel + Render + Supabase **tonight** (find hosting problems early), then auth
  (register/login/logout, httpOnly cookie, ownership middleware) with tests.
- **Phase 2, Tue morning: core**
  Cases + medicines CRUD (own data only), public demo cases (browse), seed synthetic data,
  AI extraction (Zod-validated, source sentence) + reconciliation engine (unit-tested) + comparison view.
- **Phase 3, Tue afternoon: DMS value**
  DMS stage tracker + autosave, stage 2 re-check (same engine), claim-ready summary, claims & stats page,
  rule-based high-risk flags, Swagger API docs.
- **Phase 4, Tue 22:00 → ~01:00: test and hand over** (**feature freeze at 22:00**)
  Security review (`security-review`), run `docs/test-sheet.md` on the live URL (desktop + phone, private
  window), fix, retest, record pass rates. README, client guide, developer notes, AI usage log, update
  `architecture.md` to match the build, clean code, tick `docs/requirements-checklist.md`.
- **Phase 5, Wed 06:00 → 08:30: final checks only**
  Fresh-eyes run of the main demo journey on the live URL, check README and links, confirm no secrets in the
  repo, submit by 08:30. **No new features, no risky deploys.**

**Cut order if behind schedule** (cut from the top): Swagger → high-risk flags → stage 2 re-check →
claim summary (keep a simple "claim ready" status).
**Never cut:** designs-before-code, auth + ownership checks, reconciliation tests, error handling, live deploy, README.
**Later / "what's next" slide:** PDF/photo upload, dm+d matching, audit log, FHIR export, redaction demo,
Agentation, error monitoring, Playwright E2E.

## Skills (use these, don't wait for auto-triggering)
- **After every feature:** use `explain-and-log` (plain-English explanation + `docs/decisions.md` entry).
- **Any UI or styling work:** use `dischargeiq-design` together with `frontend-design`.
  Follow `docs/design-system.md` once it exists.
- **Browser testing (Phase 4):** use `webapp-testing`.
- **Before installing any third-party skill, plugin or MCP server:** use `skill-safety-check`.
- **Planning a new project or big feature:** use `grill-plan`.

## Key docs
- `docs/brief.md` — product brief (Route A, needs tutor approval)
- `docs/architecture.md` — data model, endpoints, security, risks
- `docs/decisions.md` — decision log (append only)
- `docs/user-research.md` — pharmacist questionnaire + findings
- `docs/consult-claude-code.md` — proposed decisions awaiting your expert review (first session)
- `docs/requirements-checklist.md` — marking scheme + handover + go-live checklists (target: Distinction)
- `docs/designs/` — desktop + mobile page layouts (before code)
- `docs/ai-usage-log.md` — AI tools, important prompts, what was kept/changed/rejected, how checked
- `docs/test-sheet.md` — live end-to-end tests and pass rate

## Commands (fill in once the project is scaffolded)
- `npm run dev` —
- `npm test` —
- `npm run migrate` —
- `npm run seed` —
