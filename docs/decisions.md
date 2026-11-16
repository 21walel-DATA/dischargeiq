# Decision Log

*Append only. One entry per decision. Newest at the bottom. This is the owner's Q&A preparation.*

Template:
```
## D-XXX — Title
- Date:
- Decision:
- Why:
- Alternatives considered:
- How I'd explain it in 30 seconds:
```

---

## D-001 — Route A with a health-tech idea
- Date: 2026-11-03
- Decision: Own idea (Route A), using pharmacy domain knowledge.
- Why: A real, current NHS problem plus personal expertise is the strongest way to stand out and answer "why you?".
- Alternatives considered: Route B collections app; developer tools (log auditor, BI engine); medicine shortage tracker.

## D-002 — Focus on Discharge Medicines Service reconciliation
- Date: 2026-11-03
- Decision: Build a tool that compares pre-admission and discharge medicine lists for DMS referrals.
- Why: Confirmed time-consuming by a practising pharmacist; safety-critical; very visual demo.
- Alternatives considered: Private prescriber safety bridge (rejected — consented record access already exists); SSP navigator (rejected — wholesalers and PMRs already push SSP alerts); interaction checker (rejected — PMRs already do it, and AI regimen advice is high risk).

## D-003 — "AI reads, code compares, pharmacist approves"
- Date: 2026-11-03
- Decision: AI only extracts structured data; the comparison is deterministic code; a human approves.
- Why: Testable, explainable, safer; avoids AI making clinical decisions.
- Alternatives considered: Asking the AI to produce the diff directly (non-deterministic, hard to test).
- How I'd explain it in 30 seconds: "I use AI where it's strong — reading messy text — and plain code where I need guarantees. The comparison is unit-tested, and a pharmacist always signs off."

## D-004 — Synthetic data only
- Date: 2026-11-03
- Decision: No real patient data in the prototype; demo letters written by the owner.
- Why: UK GDPR special category data; removes most prototype security risk while still demonstrating production controls.
- Alternatives considered: Anonymised real letters (still personal data risk, needs governance).

## D-005 — No local LLM, no vector database (for now)
- Date: 2026-11-03
- Decision: Use the Claude API from the backend; skip pgvector/RAG and local models.
- Why: Local models can't run on free hosting and are less accurate; there's no large document library to search, so RAG would be decoration.
- Alternatives considered: Ollama/Llama locally; pgvector over guideline text (also licensing issues with BNF/SPC content).

## D-006 — Markdown for project docs
- Date: 2026-11-04
- Decision: Keep docs and CLAUDE.md in Markdown.
- Why: Plain text uses the fewest tokens; Claude Code auto-loads CLAUDE.md only in that name/format.
- Alternatives considered: HTML (extra tag tokens), PDF (needs conversion).

## D-007 — TypeScript instead of JavaScript (ACCEPTED 2026-11-16, consult P1; simplicity rules in D-016)
- Date: 2026-11-12
- Decision: Use TypeScript in strict mode across client, server and shared code, kept simple.
- Why: When AI writes most of the code, the type checker acts as a second reviewer that catches mistakes
  before the code runs. Shared Zod schemas give one definition of a "medicine" for the whole app.
  Standard for apps meant to grow; suits health data where correctness matters.
- Alternatives considered: JavaScript (easier start, but mistakes only show up when the code runs).
- How I'd explain it in 30 seconds: "TypeScript is JavaScript with labels. Every piece of data says what
  shape it has, for example a medicine always has a name and a strength, and the computer checks every
  label before the app runs. Since AI wrote much of my code, that check is like a second reviewer. The
  labels are removed when it's built, so the browser still runs normal JavaScript."

## D-008 — Supabase PostgreSQL, accessed only by our own API (ACCEPTED 2026-11-16, consult P2; connection details in D-017)
- Date: 2026-11-12
- Decision: Supabase-managed PostgreSQL (London region) plus Storage; the browser never talks to Supabase;
  our own Express API and our own auth.
- Why: Still standard Postgres (portable, no lock-in), UK data residency, built-in storage for uploaded
  letters. Owning the API and auth matches the brief and is easier to explain.
- Alternatives considered: Neon (Postgres only); Supabase Auth (less to explain about our own security design).
- How I'd explain it in 30 seconds: "Supabase hosts my PostgreSQL database in London. Only my server can
  reach it, so no database key ever goes to the browser, and I locked the tables down so they can't be
  read any other way. Because it's ordinary Postgres, I could move it to NHS-approved hosting later
  without rewriting the app."

## D-009 — DMS stage tracker with autosave (ACCEPTED 2026-11-16, consult P6; data model in D-021)
- Date: 2026-11-12
- Decision: Each case tracks DMS stages 1–3 (72-hour target for stage 1), and every edit autosaves.
- Why: User research: losing progress unless saved as a draft is a key frustration, and the service is
  structured in three paid stages.
- Alternatives considered: Single "approved" status only (doesn't match the real workflow).

## D-010 — One comparison engine, reused for stage 2 (ACCEPTED 2026-11-16, consult P7; matching rules in D-022)
- Date: 2026-11-12
- Decision: The comparison engine compares any two medicine lists; stage 2 compares the discharge list with
  the first new prescription.
- Why: A pharmacist reported a real error: a GP issued a prescription ignoring the hospital's change. Reusing
  one tested engine for two safety checks is less code and more reliable.
- Alternatives considered: Separate logic for stage 2 (duplicate code, more to test).

## D-011 — Claim-ready record and claims dashboard (ACCEPTED 2026-11-16, consult P8; see D-023)
- Date: 2026-11-12
- Decision: Generate a claim-ready summary for NHSBSA Manage Your Service; show claims ready, value and
  unclaimed work. No automatic submission (no known public API); that's a production-path item.
- Why: User research: a pharmacist submits zero claims because the process is too convoluted. The app then
  saves time *and* recovers income (£35 per full DMS), a much stronger value for pharmacies.
- Alternatives considered: Leaving claims out (misses the strongest business case).

## D-012 — CI/CD from day one (details refined in D-020)
- Date: 2026-11-12
- Decision: GitHub Actions runs type-check, lint, tests and build on every push/PR; hosts auto-deploy `main`;
  Dependabot and secret scanning on.
- Why: Catches mistakes early, protects the live demo, and shows professional practice to an engineer panel.
- Alternatives considered: Adding CI in Tier 2 (more risk while the foundation is built); manual deploys.
- How I'd explain it in 30 seconds: "Every time I push code, a robot checks the types, runs my tests and
  builds the app. If anything fails, the change can't go live. If it passes, it deploys automatically.
  So what you see live has always passed the tests."

## D-013 — No Astro; React stays
- Date: 2026-11-12
- Decision: Keep React + Vite; don't add Astro.
- Why: Astro is built for content-heavy sites; this app is highly interactive, which is React's strength.
  A second framework adds learning without benefit.
- Alternatives considered: Astro for the public pages only (two frameworks to maintain).

## D-014 — Reject the "caveman" token-saving skill
- Date: 2026-11-12
- Decision: Don't install it.
- Why: Independent tests show it cuts output tokens by only ~12–23%, which is about 1–3% of a real bill, and
  terse replies work against the owner's need for clear plain-English explanations. Bigger savings come from
  a lean CLAUDE.md, details kept in `docs/`, and installing only the skills we need.
- Alternatives considered: Using it (tiny saving, worse learning).

## D-015 — Tools from a developer friend sent for review (RESOLVED 2026-11-16: see D-024 to D-028)
- Date: 2026-11-12
- Decision: Tailwind + shadcn/ui themed with our tokens, Agentation (development only), Vercel's
  web-design-guidelines skill, Mermaid diagrams, and Vercel + Render + Supabase hosting are all sent to
  Claude Code for expert review before adopting.
- Why: Get a second expert opinion before changing the stack.

---
*Entries D-016 to D-031 record the owner's decisions on the expert review (`docs/consult-review.md`), 16 Nov 2026.*

## D-016 — TypeScript simplicity rules (ACCEPTED, consult P1)
- Date: 2026-11-16
- Decision: Strict mode; explicit types on function inputs and outputs; no `any` (use `unknown` + Zod);
  only `type` aliases and Zod-inferred types (no classes, `enum`, hand-written generics or decorators);
  no non-null assertions (`value!`); one shared `tsconfig.base.json`.
- Why: Keeps every line explainable in Q&A while the type checker still catches AI-written mistakes.
- Alternatives considered: Plain JavaScript; "anything goes" TypeScript (harder to read and explain).
- How I'd explain it in 30 seconds: "I use a small, strict subset of TypeScript: every function says what goes
  in and what comes out, and anything from outside, like the AI's answer, is checked by Zod first."

## D-017 — Connect to Supabase with `pg` via the IPv4 session pooler; deny-all RLS (ACCEPTED, consult P2)
- Date: 2026-11-16
- Decision: Express connects with the `pg` library using Supabase's session pooler connection string (IPv4, SSL).
  No `supabase-js`, no service-role key. RLS enabled on every table with no policies, and table privileges
  revoked from `anon` and `authenticated`. A daily health check that runs `SELECT 1` stops the free project pausing.
- Why: Supabase's direct connection is IPv6-only on the free tier and Render can't reach IPv6. Our server role
  bypasses RLS anyway, so per-user RLS policies would add complexity without protection; ownership is enforced
  in SQL (`WHERE user_id = $1`) and tested.
- Alternatives considered: `supabase-js` + service-role key (a "god key" with no benefit); per-user RLS
  (needs Supabase Auth JWTs we don't use).

## D-018 — Plain parameterised SQL with `pg` and a small migration runner (ACCEPTED, consult P3)
- Date: 2026-11-16
- Decision: Hand-written SQL with `$1` parameters, a hand-written row type per table, Zod parsing for anything
  leaving the API. Migrations are numbered `.sql` files run by a ~40-line `migrate.ts` that records applied
  files in `schema_migrations`, each in a transaction. Forward-only.
- Why: Most explainable option; no ORM or query-builder API to learn.
- Alternatives considered: Kysely, Drizzle, Prisma; `node-pg-migrate` or the Supabase CLI for migrations.
- How I'd explain it in 30 seconds: "I write the SQL myself and pass values as parameters, so SQL injection
  isn't possible. Each database change is a numbered SQL file, and a small script applies the new ones in order."

## D-019 — npm workspaces monorepo: client, server, shared (ACCEPTED, consult P4)
- Date: 2026-11-16
- Decision: One repo with npm workspaces. `shared` is a package (`@dischargeiq/shared`) exporting its
  TypeScript source; Vite compiles it for the client; the server runs with `tsx` in development and is bundled
  with `tsup` for production. `"type": "module"` everywhere; one Zod version. Hosts install from the repo root.
- Why: Avoids the usual monorepo traps (tsc rootDir errors, CommonJS/ESM mix, hosts not resolving workspaces).
- Alternatives considered: Separate repos (shared code duplicated); building `shared` with `tsc` project references.

## D-020 — CI/CD details for the sprint (ACCEPTED, consult P5; refines D-012)
- Date: 2026-11-16
- Decision: One GitHub Actions workflow (`npm ci → typecheck → lint → test → build`) on every push.
  Small commits straight to `main` during the sprint (no PR-per-change); Render auto-deploys only after CI passes;
  Vercel deploys `main` with preview deploys. Migrations run from a manual GitHub Actions job using a
  `DATABASE_URL` secret, additive changes only. API tests run against a Postgres service container in CI;
  the reconciliation engine has pure unit tests. Dependabot weekly, no dependency merges during the sprint;
  secret scanning and push protection on.
- Why: Protects the live demo without slowing a solo developer; ownership bugs live in SQL, so they're
  tested against a real database, not mocks.
- Alternatives considered: Branch protection + PRs for every change (too slow for a solo 30-hour sprint);
  mocked database tests; running migrations by hand.

## D-021 — Separate `dms_stages` table with a status per stage (ACCEPTED, consult P6)
- Date: 2026-11-16
- Decision: One row per stage per case (`UNIQUE (case_id, stage)`), created with the case. Each row has
  `status` (`pending` | `completed` | `not_applicable`), `not_applicable_reason`, `completed_at`,
  `completed_by`, `notes`. **A case is claim-ready when every applicable stage is completed** (no `pending`
  stages left and at least stage 1 completed). Stages need not be done in strict order.
  Autosave: debounced PATCH (~800 ms and on blur) of changed fields only; "Saving… / Saved / Couldn't save,
  retry" status; warning before leaving with an unsaved change; last write wins.
- Why: Real DMS stages can't always be completed (readmission, patient declines, no new prescription), so
  "done / not done" isn't enough. Rows are cleaner than 15 repeated columns.
- Alternatives considered: Columns on `cases` (simpler but repetitive, no room for status and reason);
  optimistic locking with `updated_at` (later).

## D-022 — Comparison engine matching: exact normalised names, no fuzzy matching (ACCEPTED, consult P7)
- Date: 2026-11-16
- Decision: Match on the normalised generic name (lowercase, trimmed, form words like "tablets" removed,
  brand names mapped to generics through a small hand-written list; salt names kept). Then compare strength
  (units normalised: mg / micrograms / g / units), dose, frequency (synonyms normalised), form/release and route.
  **No fuzzy matching.** Lines the engine can't pair or can't resolve (duplicates, missing strength) are
  marked **needs review** for the pharmacist rather than guessed. Tests cover the 13 edge cases in
  `consult-review.md` (P7) and are written first.
- Why: Look-alike, sound-alike drug names (hydralazine/hydroxyzine) make fuzzy matching unsafe; an unmatched
  line is visible and safe, a wrong match is not.
- Alternatives considered: Fuzzy string matching; dm+d code matching (Tier 2 / later).
- How I'd explain it in 30 seconds: "The engine only pairs medicines when the names match exactly after
  tidying them up. If it isn't sure, it doesn't guess: it hands the line to the pharmacist."

## D-023 — Claim summary only; no MYS submission (ACCEPTED, consult P8)
- Date: 2026-11-16
- Decision: A claim-ready screen with one "Copy" button per field, in the order of the MYS form, plus a
  "claim by" date. No PDF (browser print covers it). No automatic submission.
- Why: NHSBSA's DMS API is a supplier integration (e.g. PharmOutcomes → MYS) and isn't available yet; there
  is no public API. MYS also shortened its DMS claim journey in July 2025, so check current fields before presenting.
- Alternatives considered: PDF export; automating the MYS website (not allowed, unsafe).

## D-024 — Hosting: Vercel + Render + Supabase, with `/api` proxied through Vercel (ACCEPTED, consult P9 + P14)
- Date: 2026-11-16
- Decision: Client on Vercel; API on Render; database on Supabase (London). Vercel rewrites `/api/*` to the
  Render API, so the browser only talks to one origin and the login cookie is first-party
  (`HttpOnly; Secure; SameSite=Lax`). The client calls relative `/api/...` URLs. An uptime monitor pings
  `/api/health` every 10 minutes to avoid Render cold starts; open the app 10 minutes before presenting;
  backup demo video. Cloud Run goes on the "path to production" slide.
- Why: Vercel and Render are different sites, so a cookie set directly by Render is third-party and is
  blocked by Safari (and increasingly Chrome); login would fail on the phone test.
- Alternatives considered: `SameSite=None` cross-site cookies (blocked by browsers); tokens in localStorage
  (exposed to XSS); Google Cloud Run (about half a day of setup).
- How I'd explain it in 30 seconds: "The browser thinks the API lives on the same website as the app,
  because Vercel forwards `/api` calls to my server. That keeps the login cookie first-party and secure,
  and it works on iPhones too."

## D-025 — Plain CSS + CSS Modules with design tokens (REPLACED the Tailwind + shadcn/ui proposal, consult P10)
- Date: 2026-11-16
- Decision: Keep plain CSS: `tokens.css` (CSS custom properties) + CSS Modules per component. Use native
  accessible HTML (`<dialog>`, `<details>`, `<table>`, `role="status"` for autosave). Build the
  reconciliation view ourselves.
- Why: shadcn brings a lot of hidden code (`cva`, `cn()`, Radix, Tailwind config) that would be hard to explain;
  the app needs few complex components; no extra setup in a 30-hour sprint.
- Alternatives considered: Tailwind + shadcn/ui; Tailwind alone.

## D-026 — Agentation deferred (ACCEPTED, consult P11)
- Date: 2026-11-16
- Decision: Don't install during the sprint; it stays on the "later" list. If adopted: full `skill-safety-check`,
  devDependency, loaded only via a dev-only dynamic import, plus a CI check that it isn't in the production bundle.
- Why: Small benefit in a 30-hour build; the safety review alone would cost 20–30 minutes.

## D-027 — Skip Vercel's agent skills; use Lighthouse and axe instead (ACCEPTED, consult P12)
- Date: 2026-11-16
- Decision: Don't install `web-design-guidelines` or `react-best-practices`. Run Lighthouse and axe DevTools in Phase 4.
- Why: `react-best-practices` targets Next.js; `web-design-guidelines` overlaps our design skills. Lighthouse
  and axe give objective accessibility scores for the presentation.

## D-028 — Diagrams as code with Mermaid (ACCEPTED, consult P13)
- Date: 2026-11-16
- Decision: ERD and architecture diagram in Mermaid inside `docs/architecture.md`; one draw.io diagram for the slides.
- Why: Version-controlled, rendered by GitHub, updated alongside the data model.

## D-029 — Mini clinical hazard log (NEW, from consult P15)
- Date: 2026-11-16
- Decision: Keep `docs/hazard-log.md` in a DCB0129 style: hazard, cause, effect, controls, and the test that
  proves each control.
- Why: Links clinical-safety practice to engineering evidence; shows how the product would be assured for real use.
- Alternatives considered: Only a "not a medical device" statement (less convincing).
- How I'd explain it in 30 seconds: "In the NHS, clinical software needs a hazard log. I wrote a small one:
  each thing that could hurt a patient, how my design prevents it, and the test that proves it."

## D-030 — Guard against real NHS numbers (NEW, from consult P15)
- Date: 2026-11-16
- Decision: The server checks free-text inputs (letter, notes, medicine lines) for 10-digit NHS-number-like
  values. Anything that passes the Modulus 11 check and is **not** in the 999 test range is rejected with a
  friendly message. Unit-tested.
- Why: Enforces "synthetic data only" in code, not just in policy (golden rules 1 and 14).
- Alternatives considered: A warning banner only (easy to ignore).

## D-031 — Updated cut order (NEW, from consult P15)
- Date: 2026-11-16
- Decision: If behind schedule, cut from the top: admin UI (keep the `role` column; high-risk rules live in a
  code file) → Swagger (hand-written endpoint table in the README instead) → high-risk flags → stage 2 re-check →
  claim summary (keep a simple "claim ready" status).
- Why: The real build window is about 30 hours; the admin UI and Swagger add the least user value.
