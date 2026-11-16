# CLAUDE.md — DischargeIQ (working title)

Read this file first in every session. Then read the files in `docs/` before planning any work.

> **Expert review done (16 Nov 2026):** `docs/consult-review.md` holds the review; the owner's decisions are
> D-016 to D-032 in `docs/decisions.md`. The stack below is decided; change it only with a new decision entry.

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

This is an individual bootcamp final project (TFS – Vibe Coding Web App, Route A) aiming for the top 5:
planned from 3 Nov 2026, **built in a two-day sprint (Mon 16 – Tue 17 Nov, about 30 working hours)**,
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
   The server rejects NHS-number-like values outside the 999 range (D-030).
2. **Secrets only in `.env`** (never committed; `.env.example` lists names only). The frontend never sees an API key.
   Claude Code is blocked from reading `.env` files (`.claude/settings.json`, D-038). Never ask the owner to paste a
   secret into the chat or to run a secret-generating command with `!`: tell them the exact file + variable name and
   to run any generator in a **separate PowerShell terminal**. When diagnosing a connection, print **only error codes
   and yes/no facts**, never error message text (it can contain parts of the connection string, D-041).
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
    use env vars. The client calls relative `/api/...` URLs (Vercel forwards them to the API).
16. **Keep the handover docs current:** add to `docs/ai-usage-log.md` when an AI suggestion mattered or was
    rejected; tick `docs/requirements-checklist.md` as items are met.

## Tech stack (decided 16 Nov 2026, see `docs/decisions.md` D-007 to D-039)
- **Language:** **TypeScript** everywhere (strict mode), kept beginner-readable (D-016): explicit types on function
  inputs/outputs; no `any` (use `unknown` + Zod); `type` aliases and `z.infer` only (no classes, `enum`,
  hand-written generics, decorators); no non-null assertions (`value!`); one shared `tsconfig.base.json`
- **Monorepo:** npm workspaces (`client`, `server`, `shared`); `"type": "module"` everywhere; `shared` exports its
  TS source; server runs with `tsx` in dev and is bundled with `tsup`; hosts install from the repo root (D-019)
- **Frontend:** React + Vite + TypeScript, React Router, **plain CSS + CSS Modules** with design tokens in
  `tokens.css` (mobile-first, responsive). Native accessible HTML (`<dialog>`, `<details>`, `<table>`,
  `role="status"`). **No Tailwind, no shadcn/ui** (D-025)
- **Backend:** Node.js + Express + TypeScript, REST JSON API under `/api`, layered (routes → controllers → services → db)
- **Shared:** Zod schemas in a `shared/` folder used by both client and server; types inferred with `z.infer`
- **Database:** **Supabase** (managed PostgreSQL, London region) accessed **only by our Express API** with the
  `pg` library over the **IPv4 session pooler** connection string (SSL). No `supabase-js`, no service-role key.
  RLS on every table with no policies + privileges revoked from `anon`/`authenticated` (D-017).
  Plain parameterised SQL; numbered `.sql` migrations applied by our own small `migrate.ts` (D-018).
  Supabase Storage for uploaded letters (later)
- **Auth:** our own: bcrypt password hashing + JWT in an `HttpOnly; Secure; SameSite=Lax` cookie, role-based
  access (pharmacist, admin). Not Supabase Auth (we want to own and explain it; production would use NHS CIS2)
- **AI:** Anthropic Claude API, called **only from the backend**; model name set via env var
- **Validation:** Zod (request bodies and AI responses)
- **Testing:** Vitest + Supertest; API/ownership tests against a real Postgres (service container in CI);
  reconciliation engine as pure unit tests written first. Lighthouse + axe for accessibility (D-027)
- **Hosting (D-024):** client on **Vercel**, API on **Render**, DB on **Supabase**. **Vercel rewrites `/api/*` to
  Render**, so the browser sees one origin and the login cookie is first-party (works on iPhone Safari).
  Uptime ping on `/api/health` (which runs `SELECT 1`) every 10 min to avoid cold starts and Supabase pausing
- **CI/CD (D-020):** one GitHub Actions workflow (`npm ci → typecheck → lint → test → build`) on every push;
  small commits to `main` during the sprint; Render auto-deploys only after CI passes; Vercel preview deploys;
  migrations via a manual GitHub Actions job (additive only); Dependabot weekly (no merges during the sprint);
  secret scanning + push protection on

## Folder structure (target)
```
/shared            Zod schemas + inferred types used by client and server
/client            React app
  vercel.json      rewrites /api/* to the Render API (Vercel root directory = client)
  /src/pages       one file per page
  /src/components  reusable UI
  /src/api         fetch wrappers for our API
  /src/styles      tokens.css + global styles (components use *.module.css)
/server            Express API
  /routes          route definitions
  /controllers     request handling
  /services        business logic (ai.service, reconcile.service, highrisk.service, dms.service, claim.service)
  /validators      Zod schemas (incl. the NHS number guard)
  /middleware      auth, error handler, rate limit
  /db              connection, migrate.ts, migrations/*.sql, seed (synthetic data only)
  /tests
/docs              brief, architecture, decisions, user research, hazard log
```

## Sprint plan (Mon 16 Nov → Wed 18 Nov 08:30). Deploy early, commit small and often.
- **Phase 0, Mon afternoon (~2h): decide and design**
  1. ~~Review `docs/consult-claude-code.md`~~ **Done 16 Nov** (`docs/consult-review.md`, D-016 to D-032).
  2. ~~`dischargeiq-design`: pick a direction~~ **Done** → `docs/design-system.md` (D-033).
  3. ~~Desktop + mobile layouts for all 8 pages~~ **Done** → `docs/designs/`, committed before any code (D-034).
- **Phase 1, Mon evening: foundation + go live early**
  Scaffold monorepo (shared/client/server), CI on GitHub Actions, `.env.example`, Supabase DB + migrations,
  deploy a "hello world" to Vercel + Render + Supabase **tonight** (find hosting problems early; prove the
  `/api` rewrite, the session-pooler connection and a cookie round-trip on a phone), then auth
  (register/login/logout, httpOnly cookie, ownership middleware) with tests.
- **Phase 2, Tue morning: core**
  Cases + medicines CRUD (own data only), public demo cases (browse), seed synthetic data,
  AI extraction (Zod-validated, source sentence) + reconciliation engine (unit-tested) + comparison view.
- **Phase 3, Tue afternoon: DMS value**
  DMS stage tracker (status per stage, incl. "not applicable") + autosave, stage 2 re-check (same engine),
  claim-ready summary (copy buttons, no MYS submission), claims & stats page, rule-based high-risk flags
  (rules in a code file), NHS number guard, Swagger API docs.
- **Phase 4, Tue 22:00 → ~01:00: test and hand over** (**feature freeze at 22:00**)
  Security review (`security-review`), Lighthouse + axe, **owner reviews and adjusts the hazard-log risk
  scores** (`docs/hazard-log.md`; first draft by Claude Code) and updates the controls to match the build,
  run `docs/test-sheet.md` on the live URL (desktop + phone, private window), fix, retest, record pass rates. README, client guide, developer notes, AI usage log, update
  `architecture.md` to match the build, clean code, tick `docs/requirements-checklist.md`.
- **Phase 5, Wed 06:00 → 08:30: final checks only**
  Fresh-eyes run of the main demo journey on the live URL, check README and links, confirm no secrets in the
  repo, submit by 08:30. **No new features, no risky deploys.**

**Cut order if behind schedule** (cut from the top, D-031): admin UI (keep the `role` column) → Swagger
(hand-written endpoint table in the README) → high-risk flags → stage 2 re-check → claim summary
(keep a simple "claim ready" status).
**Never cut:** designs-before-code, auth + ownership checks, reconciliation tests, error handling, live deploy, README.
**Later / "what's next" slide:** PDF/photo upload, dm+d matching, audit log, FHIR export, redaction demo,
Agentation, error monitoring, Playwright E2E, Google Cloud Run, electronic referral intake (PharmOutcomes),
MYS submission via the NHSBSA supplier API once available.

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
- `docs/consult-claude-code.md` — the original proposals (P1–P15); `docs/consult-review.md` — the expert review
- `docs/hazard-log.md` — mini clinical hazard log (DCB0129 style): hazard, controls, proving test
- `docs/requirements-checklist.md` — marking scheme + handover + go-live checklists (target: Distinction)
- `docs/designs/` — desktop + mobile page layouts (before code)
- `docs/ai-usage-log.md` — AI tools, important prompts, what was kept/changed/rejected, how checked
- `docs/test-sheet.md` — live end-to-end tests and pass rate

## Commands (run from the repo root)
- `npm run dev:server` — API on port 3000 with auto-restart (reads `server/.env`)
- `npm run dev:client` — React app (Vite); forwards `/api` to `API_PROXY_TARGET` from `client/.env`
- `npm test` — server tests against `TEST_DATABASE_URL` only (refuses to touch the main database)
- `npm run typecheck` / `npm run lint` / `npm run build` — the same checks CI runs
- `npm run migrate` — apply new `server/db/migrations/*.sql`; for production use GitHub Actions → "Run migrations"
- `npm run seed` — (Phase 2) synthetic demo cases

## Live
- API (Render, Frankfurt): https://dischargeiq-api-nr30.onrender.com/api/health
- App (Vercel): to be added after the first deploy
