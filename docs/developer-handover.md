# Developer handover: DischargeIQ

For a developer taking over the code. Start with the [README](../README.md) (run it locally) and
[`architecture.md`](architecture.md) (the full design); every choice and its reasons are in
[`decisions.md`](decisions.md) (D-001 onwards, append-only). State as of 17 Nov 2026.

## 1. Architecture in one page
```
Browser ──> Vercel (React app; rewrites /api/* to Render) ──> Render (Express API, Frankfurt)
                                                                 ├──> Supabase Postgres (London), pg over the
                                                                 │    session pooler with SSL; RLS deny-all
                                                                 └──> Claude API (reads letters; server only)
shared/ = Zod schemas + types used by both sides
```
- **One origin.** The browser only talks to the Vercel URL; Vercel forwards `/api/*` to Render. That keeps the
  login cookie first-party (it works in iPhone Safari) and the client uses relative `/api/...` URLs only (D-024).
- **Layers (server):** `routes/` (URL → middleware chain) → `controllers/` (check input with the shared Zod schema,
  call a service, shape the reply) → `services/` (business logic, SQL) → `db/pool.ts`. No ORM: plain parameterised
  SQL.
- **Middleware order on a case route:** `requireAuth` (JWT cookie → `res.locals.user`) → `loadOwnedCase`
  (`SELECT … WHERE id = $1 AND user_id = $2`; anything else is 404) → controller. Controllers only use the checked
  id (`getOwnedCaseId`), never `req.params.id`. Medicines use `loadOwnedMedicine`; public demo routes use
  `loadDemoCase` (`is_demo = true` only).
- **"AI reads, code compares, pharmacist approves":**
  - `ai.service.ts` is the only file that calls an AI. `extractMedicines` (letter text → medicine lines with source
    sentences) and `transcribeLetter` (PDF/photo → text). Both answers are checked with Zod (`shared/`) before use.
    Without `ANTHROPIC_API_KEY`, and always under Vitest, a mock is used.
  - `reconcile.service.ts` is the deterministic comparison engine (no AI, no database); `highrisk.rules.ts` is the
    hand-written high-risk list; `comparison.service.ts` runs them on a case.
  - `stage.service.ts` enforces the approval gate on the server: completing stage 1 or 2 re-runs the comparison and
    returns 409 while any "needs review" line is unacknowledged.
- **Errors:** controllers return friendly `{ error, fields? }` for expected failures; anything thrown reaches
  `middleware/errorHandler.ts`, which answers a generic 500 and logs only a safe summary (`services/logSafe.ts`:
  name, code, stack frames; never messages, request bodies or database details).
- **Front end:** `client/src/pages` (one file per page), `components/`, `api/` (fetch wrappers that check every
  answer with the shared Zod schemas), `styles/tokens.css` (the only place colours, fonts and spacing are defined;
  see `design-system.md`). Auth state: `auth/AuthContext.tsx`; protected pages use `RequireAuth`.

## 2. Environments and secrets
| Where | What is set | Notes |
|---|---|---|
| Local | `server/.env`, `client/.env` | Names in the README and the two `.env.example` files. Never committed |
| Render (API) | `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`) | Render dashboard → Environment (the names the code reads; confirm against the dashboard) |
| GitHub Actions | `DATABASE_URL` repository secret | Used only by the manual "Run migrations" workflow |
| Vercel | nothing secret | `client/vercel.json` holds the rewrite target (the public Render URL) |

Rules (CLAUDE.md, D-038, D-041): secrets only in `.env` files and host settings; never in a `VITE_` variable;
never paste one into a chat or a log; when debugging a connection print only error codes, never error text.
The Anthropic key has a spending cap. Rotating a secret: change it in the host's settings and redeploy; changing
`JWT_SECRET` logs everyone out.

## 3. How to deploy
Everything deploys from `main`.

1. Push to `main` (or merge a branch). GitHub Actions (`.github/workflows/ci.yml`) runs
   `npm ci → typecheck → lint → test → build` with a throwaway Postgres container.
2. **Render** deploys the API only after CI passes. Settings: region Frankfurt; build
   `npm ci --include=dev && npm run build -w server`; start `npm run start -w server` (runs `server/dist/index.js`
   from the `server` folder, which is where `db/certs/supabase-ca.crt` is found); health check `/api/health`.
3. **Vercel** deploys the client (root directory `client`, Vite framework preset: `vite build` into `dist`; confirm
   in the Vercel project settings). Branches get preview URLs, protected by Vercel login; previews call the
   **production** API through the same rewrite.
4. Check: https://dischargeiq-pied.vercel.app/api/health returns `{"status":"ok","database":"ok"}`.

The free Render instance sleeps when idle (first request up to a minute) and the free Supabase project pauses after
a week without activity. `/api/health` runs `SELECT 1`, so pinging it keeps both awake: an **UptimeRobot** monitor
(owner's account) calls https://dischargeiq-pied.vercel.app/api/health every 5 minutes and alerts if it fails.
Still open the app a few minutes before a demo.

**Rolling back:** redeploy the previous deploy in the Render / Vercel dashboards, or `git revert` the commit and
push. Migrations are forward-only, so a rollback must not depend on undoing one (see below).

## 4. How to add a database migration
Migrations are plain SQL files applied in name order by our own `server/db/runMigrations.ts`; each file runs in a
transaction and is recorded in `schema_migrations`.

1. Add `server/db/migrations/005_short_name.sql` (next number; never edit or rename an applied file).
2. **Additive only** (D-020): new tables, new nullable columns, new indexes. No `DROP` or renames while the old code
   may still be running.
3. **For a new table**, lock it down like every other table (D-017):
   ```sql
   ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
   DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON my_table FROM anon; END IF;
     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON my_table FROM authenticated; END IF;
   END $$;
   ```
4. Run `npm test`: the test setup applies every migration to `TEST_DATABASE_URL` first, so a broken file fails here.
5. Commit and push; CI applies it to its own throwaway database too.
6. **Production:** GitHub → Actions → **Run migrations** → *Run workflow*. It runs `npm run migrate` then
   `npm run seed` (which recreates only the synthetic demo cases). Deploy code that *uses* the new column after this.

## 5. Tests
- `npm test` runs every server test against `TEST_DATABASE_URL`; `tests/testDatabaseUrl.ts` refuses to start if that
  points at the same database as `DATABASE_URL`.
- What is covered: the comparison engine (pure unit tests, written first), auth, **ownership on every case and
  medicine route** (another user → 404, logged out → 401), the NHS number guard, stages and the approval gate,
  claims, the upload route, and error handling (users and logs never see internal details). 196 tests.
- Not covered: no automated browser (end-to-end) tests and no client unit tests. Live end-to-end checks, Lighthouse,
  axe and colour-vision results are recorded by hand in `test-sheet.md`.

## 6. Known limitations
**Security and privacy**
- A login token can't be revoked: logging out deletes the cookie, but a copied token stays valid for up to 8 hours.
  Production path: a server-side session table or NHS CIS2 (D-043).
- Rate limits (login, register, letter reading) are counted in this server's memory: they reset on restart and
  wouldn't be shared between several instances. `trust proxy` is 2 (Vercel + Render); someone calling the Render URL
  directly could fake their address and get round the limits.
- Registering with an email that already has an account says so (409), which confirms the account exists.
- Uploaded files reach the AI provider before the NHS number check can run on the text (hazard H10); only a tick
  box stops a real letter. The NHS number guard only catches NHS numbers, not names or addresses.
- The API runs in Frankfurt and the AI provider is outside the UK: acceptable only because all data is synthetic.
  Production needs UK hosting, a DPIA and an IG review (`architecture.md` section 8).
- Dependabot opens weekly version-update pull requests; Dependabot *security* updates are switched off in the
  repository settings. Secret scanning and push protection are on.

**Features not built**
- No admin UI: the `role` column and a tested `requireRole` middleware exist, but no route uses them yet (cut, D-031).
- No password reset, email verification or account deletion. Removing an account means a SQL `DELETE FROM users`
  (cases cascade).
- No audit log; no dm+d codes (`medicines.dmd_code` exists, unused); brand → generic matching is a small
  hand-written list; the "letter says stopped but the engine says unchanged" discrepancy alert is not built.
- PMR and first-new-prescription medicines are typed one line at a time (no paste or AI reading for them).
- "My cases" has no filters or paging. No electronic referral intake, FHIR export or MYS submission.
- `dms_stages.acknowledged_review_keys` is an unused column left by migration 003 (replaced by the
  `review_acknowledgements` table); drop it in a later, non-additive clean-up.

**Behaviour to know about**
- Editing a medicine gives it a new id on purpose, so its comparison line must be checked again (D-032).
- Demo mode recognises only the synthetic demo letters and the two sample upload files (by SHA-256). If you change
  a sample file, update `server/db/demoLetterFiles.ts`; a test fails until you do.
- DMS fees (`STAGE_FEES` in `shared/src/stages.ts`) and the claim-by rule are hard-coded from Community Pharmacy
  England (Nov 2026). Check them against the Drug Tariff; the exact MYS claim fields are still to be confirmed.
- Chrome on Android can't show a PDF inside the page; the upload view offers "Open the PDF in a new tab".

## 7. Where to look first
| Task | Start here |
|---|---|
| Change how medicines are compared | `server/services/reconcile.service.ts` + `server/tests/reconcile.test.ts` |
| Add a high-risk medicine | `server/services/highrisk.rules.ts` (unit-tested) |
| Change what the AI is asked | `server/services/ai.service.ts` (prompts) + `shared/src/extraction.ts` / `transcription.ts` (schemas) |
| Add an API route | `server/routes/cases.routes.ts` (always `requireAuth` then an ownership check) + `server/docs/openapi.ts` |
| Change a page | `client/src/pages/*` + its `.module.css`; tokens only (`styles/tokens.css`) |
| Add a demo case | `server/db/demoCases.ts` (synthetic only, NHS numbers from the 999 range), then the "Run migrations" job |
