# Consultation: proposed decisions for Claude Code to review

> **Status (16 Nov 2026): all items settled.** Review in `docs/consult-review.md`; owner decisions in
> `docs/decisions.md` (D-016 to D-032). Kept for the record; no further review needed.

**Timebox: 30–45 minutes.** The build sprint finishes Tue 17 Nov (see `CLAUDE.md`), so keep each answer
short: verdict + one or two reasons + any risk. Flag anything that threatens the sprint.

**Your role for this review:** act as a senior software developer and architect specialising in UK
healthcare applications: NHS digital standards and assurance (DTAC, DSPT, DCB0129/DCB0160, FHIR UK Core,
NHS CIS2, dm+d/SNOMED CT), UK GDPR for health data, and community pharmacy workflows (DMS, PMR systems,
PharmOutcomes, NHSBSA Manage Your Service). Judge every proposal from that perspective, as well as for
a beginner building a demo in a two-day build sprint (Mon 16 – Tue 17 Nov, about 30 working hours).

*Written during planning (with Claude in the claude.ai Project). Claude Code: you'll write the code, so your
expert opinion counts. For each item below, say **agree / disagree / better option**, with your reasons and
any risks we've missed. Be honest; don't just agree. The owner makes the final call. Afterwards, update
`docs/decisions.md` (change PROPOSED to ACCEPTED or REPLACED) and remove settled items from this file.*

Context to keep in mind: solo beginner developer (very little JavaScript, new to TypeScript), a two-day build sprint (about 30 working hours),
must explain every part of the code to a panel of software engineers (5 min presentation + 2 min questions),
and wants a codebase that could later grow into a real product for NHS community pharmacy.

---

## P1 — TypeScript instead of JavaScript
- **Proposal:** TypeScript in strict mode for client, server and shared code, kept deliberately simple.
- **Reasoning:** In a project where AI writes most of the code, the type checker acts as a second reviewer:
  it catches mismatches (e.g. `dose` treated as a number in one place and text in another) before the code
  runs. Shared Zod schemas give one definition of a "medicine" for client, server and AI output
  (`z.infer`). It's the industry standard for apps meant to grow, and it suits health data where
  correctness matters.
- **Concern:** The owner knows little JavaScript, so type errors could confuse her and slow her down.
- **Questions for you:** Do you agree? What rules would keep the TypeScript beginner-readable
  (e.g. no generics beyond basics, explicit types on function inputs and outputs, no `any`)?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P2 — Supabase as the database host; our own Express API and our own auth
- **Proposal:** Supabase-managed PostgreSQL (London region) plus Supabase Storage (Tier 2, for letter
  uploads). The **browser never talks to Supabase directly**; only our Express API does. Auth is ours
  (bcrypt + JWT in an httpOnly cookie), not Supabase Auth.
- **Reasoning:** It's still standard PostgreSQL (portable, no lock-in); UK data residency; Storage is built in.
  Owning the API and auth matches the TFS brief ("ideally your own API") and is easier to explain in Q&A.
  Production would replace our login with NHS CIS2 anyway.
- **Security point:** Supabase exposes an auto-generated Data API for tables in the `public` schema. Our
  proposal: enable Row Level Security on every table with **no policies** (deny-all for the anon and
  authenticated roles), never ship any Supabase key to the client, and connect from the server with a
  server-only connection string.
- **Questions for you:** Agree? Best way to connect from Express: `pg` with the connection pooler, or
  `supabase-js` with the service-role key? Is deny-all RLS the right default here, or would you also add
  per-user RLS policies as defence in depth (and is that worth the complexity for a beginner)?
  Free-tier projects pause after inactivity: how should we handle that before the demo?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P3 — How the server talks to the database
- **Proposal:** Plain parameterised SQL with `pg`, versioned SQL migration files, typed results.
- **Alternatives:** A type-safe query builder (Kysely) or an ORM (Drizzle/Prisma).
- **Questions for you:** Which gives the best balance of type safety, readability and "can explain it in Q&A"
  for a beginner? Which migration tool do you recommend?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P4 — Repository structure
- **Proposal:** One repo with `client/`, `server/`, `shared/` (npm workspaces), as in `CLAUDE.md`.
- **Questions for you:** Agree, or would you structure it differently? Any setup pitfalls with shared
  TypeScript code between Vite and Node we should avoid?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P5 — CI/CD from day one
- **Proposal:** GitHub Actions on every push/PR runs type-check, lint, unit tests and build; failing checks
  block merging to `main`. Hosts auto-deploy `main`, with preview deploys for PRs. Dependabot and secret
  scanning on. Database migrations run as a controlled step, not by hand.
- **Questions for you:** What is the simplest reliable setup? How should migrations run on deploy safely?
  Should tests run against a throwaway Postgres in CI (service container) or use mocks?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P6 — DMS stage tracker data model
- **Proposal:** Track the three DMS stages per case (stage 1: review discharge info, 72-hour target;
  stage 2: check the first new prescription; stage 3: patient consultation) with completion timestamps,
  who completed each, notes, and a claim status (`not_ready` / `ready` / `claimed`). Autosave all edits.
- **Options:** (a) columns on `cases`, (b) a separate `dms_stages` table (one row per stage per case).
- **Questions for you:** Which design is cleaner and easier to extend? What's the simplest robust autosave
  pattern (debounced PATCH, optimistic UI, conflict handling)?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P7 — One comparison engine, two uses
- **Proposal:** `reconcile.service` compares **any two medicine lists** (generic input → STARTED / STOPPED /
  CHANGED / UNCHANGED). Use 1: pre-admission vs discharge. Use 2 (stage 2): discharge vs first new
  prescription, which catches the real error a pharmacist reported ("GP issued a prescription disregarding
  the change after discharge").
- **Questions for you:** How should we match medicines in Tier 1 (normalised name + strength? fuzzy
  matching?) before dm+d codes arrive in Tier 2? What edge cases must the unit tests cover (brand vs
  generic names, same drug in two strengths, "as required" doses, unit differences like mg vs micrograms)?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P8 — Claim-ready record
- **Proposal:** When all stages are done, generate a claim summary with the information needed to claim on
  the NHSBSA Manage Your Service (MYS) portal, ready to copy. We are not aware of a public API for automatic
  MYS submission, so automation is a "path to production" item, not built.
- **Questions for you:** If you can check, confirm whether any official MYS submission API exists. What
  should the summary contain and in what format (screen, PDF, CSV)?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P9 — Hosting
- **Proposal:** Client on Vercel or Netlify, API on Render, DB on Supabase. Stretch: API on Google Cloud Run
  with Secret Manager (the owner has done Google Cloud training).
- **Known risk:** free API hosts can "sleep" when idle, so the first request in a live demo could be slow.
- **Questions for you:** Which host do you recommend for a reliable 5-minute live demo? How do we avoid
  cold starts on the day?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P10 — Tailwind CSS + shadcn/ui, themed with our own design tokens
- **Proposal:** Replace the "plain CSS" plan with Tailwind CSS and shadcn/ui components (accessible,
  built on Radix, copied into our code so we own them). Every component is themed with the project's own
  design tokens from the `dischargeiq-design` skill (`docs/design-system.md` + tokens), so the app doesn't
  have the default shadcn look that many AI-built apps share.
- **Reasoning:** Saves a lot of time on complex accessible components (dialogs, tables, dropdowns, tabs,
  toasts for autosave); widely used, so engineers recognise it; still fully customisable.
- **Concerns:** Tailwind class names are a new thing for the owner to learn and explain; risk of a generic look.
- **Questions for you:** Agree, or would plain CSS / CSS Modules be better for this owner? How do we map
  our design tokens into shadcn's theme variables cleanly? Which components should we use, and which
  should we build ourselves (e.g. the reconciliation view, which is the app's signature screen)?
  If accepted, update `CLAUDE.md` (stack + folder structure) and the `dischargeiq-design` skill to match.
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P11 — Agentation for UI feedback (development only)
- **Proposal:** Add Agentation, an open-source React library that shows a feedback toolbar in the running
  app: the owner clicks an element, types feedback, and gets a note with the exact element selector to
  paste to you. Load it **only in development**, never in the production build.
- **Reasoning:** Makes UI tweaks precise for a beginner who doesn't know the component names yet.
- **Questions for you:** Before installing, review it with the `skill-safety-check` approach (source,
  maintainer, what it accesses, whether it sends data anywhere). Then: is it worth it, and how do we
  guarantee it is excluded from the production bundle (e.g. dev-only dynamic import)?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P12 — Vercel's agent skills (`web-design-guidelines`, `react-best-practices`)
- **Proposal:** Optionally add Vercel's official `web-design-guidelines` skill as an accessibility/UX audit
  near the end (Tier 3). Probably skip `react-best-practices` (it's heavily focused on Next.js performance;
  we use Vite).
- **Questions for you:** Review both with `skill-safety-check` first. Do they add value beyond
  `frontend-design` + `dischargeiq-design`, or just add overlap and tokens?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P13 — Diagrams as code
- **Proposal:** Keep an ERD (entity relationship diagram) and an architecture diagram in **Mermaid** inside
  `docs/` (version-controlled, rendered by GitHub, regenerated when the data model changes). Use draw.io only
  for one or two polished presentation diagrams.
- **Questions for you:** Agree? Please generate the first ERD from the data model in `architecture.md` once
  P6 (stage tracker design) is decided.
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P14 — Hosting choice settled: Vercel (client) + Render (API) + Supabase (database)
- **Proposal:** Vercel rather than Netlify for the client. Render for the API only; the database stays on
  Supabase (Render's free databases are time-limited).
- **Questions for you:** Any reason to prefer Cloud Run over Render for the demo (cold starts, secrets,
  the owner's Google Cloud training)?
- Your opinion: see `docs/consult-review.md`
- Owner decision: see `docs/decisions.md` (D-016 to D-032)

## P15 — Anything we've missed?
- Is the tier plan realistic for a beginner in a two-day build sprint? What would you cut first?
- Any security, privacy or clinical-safety risk not covered in `architecture.md`?
- Anything that would make this stand out more to a panel of software engineers?
- From your NHS / UK pharmacy expertise: anything in the DMS workflow, clinical safety or NHS standards
  that we've got wrong or should design for now so the product can grow later?
- Your opinion: see `docs/consult-review.md`

## Already decided (no review needed, for context)
- **Caveman skill: rejected.** It saves only ~1–3% of the real bill, and terse output works against the
  owner's need for plain-English explanations.
