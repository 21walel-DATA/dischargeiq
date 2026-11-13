# Architecture — DischargeIQ (working title)

*Status: DRAFT v0.2 (12 Nov 2026). Items marked PROPOSED are awaiting Claude Code's review in
`consult-claude-code.md`. Log every change in `decisions.md`.*

## 1. System overview

```
[ React + TypeScript client (Vercel/Netlify) ]
        |  HTTPS, JSON, httpOnly JWT cookie
        v
[ Express + TypeScript API (Render / Cloud Run) ] --- Claude API (extraction only, key on server)
        |  server-only connection
        v
[ Supabase: PostgreSQL (London) + Storage ]    [ dm+d reference table (Tier 2, loaded from TRUD) ]

[ shared/ ]  Zod schemas + inferred types, used by client AND server
```

**Core principle — "AI reads, code compares, pharmacist approves":**
1. **Extract (AI):** Claude turns letter text/image into structured JSON medicine lines, each with the
   exact source sentence. Output is validated with Zod.
2. **Compare (deterministic code):** `reconcile.service` compares any two medicine lists and labels each line
   STARTED / STOPPED / CHANGED / UNCHANGED. No AI in this step; fully unit-tested. Used twice:
   pre-admission vs discharge (stage 1), and discharge vs first new prescription (stage 2).
3. **Flag (deterministic rules):** `highrisk.service` applies a rules table (e.g. anticoagulants,
   lithium, methotrexate, insulin, opioids) written by the owner.
4. **Approve (human):** pharmacist reviews, edits if needed, approves each stage. Every action is audit-logged.
5. **Claim:** `claim.service` builds a claim-ready record once all three DMS stages are complete.

## 2. The DMS workflow the app follows
| DMS stage | Pharmacist task | What the app does | Fee* |
|---|---|---|---|
| 1 | Review discharge information (target: within 72 hours of referral) | AI extraction + comparison vs pre-admission list; 72-hour countdown | £12 |
| 2 | Check the first new prescription after discharge | Same engine compares new prescription vs discharge list; flags mismatches | £11 |
| 3 | Consultation with the patient/carer | Checklist + notes | £12 |
| — | Monthly claim on NHSBSA Manage Your Service | Claim-ready summary to copy; claims dashboard | £35 total |

*Fees per Community Pharmacy England (checked Nov 2026). Verify before presenting.

## 3. Tech stack and why

| Layer | Choice | Why | Alternatives considered |
|---|---|---|---|
| Language | TypeScript (strict, simple) — PROPOSED | Type checker is a second reviewer for AI-written code; one shared definition of the data; industry standard for apps that grow | JavaScript (easier start, more runtime bugs) |
| Frontend | React + Vite | Taught on bootcamp, matches TFS example, component reuse | Plain HTML/JS (too manual), Next.js (more to learn), Astro (built for content sites, not interactive apps) |
| Backend | Node + Express | Same language as frontend, simple REST, keeps AI key server-side | Python/FastAPI (second language to learn) |
| Database | Supabase (PostgreSQL, London) — PROPOSED | Standard Postgres (portable); UK data residency; built-in Storage for uploads | Neon (Postgres only, no storage), MongoDB (relations matter here) |
| Auth | Own: bcrypt + JWT (httpOnly cookie) | Explainable; matches "own API" brief; production would swap to NHS CIS2 | Supabase Auth / Auth0 (less to explain about own design) |
| AI | Claude API (backend only) | Strong text + vision extraction, structured output | Local LLM (can't run on free hosting, slower, less accurate) |
| Validation | Zod (in `shared/`) | Same schema guards requests, AI output and front-end forms | Manual checks (error-prone) |
| Tests | Vitest + Supertest, Playwright | Fast, modern, works with Vite and TypeScript | Jest (fine too) |
| CI/CD | GitHub Actions + host auto-deploy | Every change checked and deployed automatically | Manual deploys (error-prone, risky before a demo) |

## 4. Data model

**users**
- `id` PK, `email` (unique), `password_hash`, `display_name`, `role` (`pharmacist` | `admin`), `created_at`

**cases** (= TFS "collections")
- `id` PK, `user_id` FK → users, `reference` (pseudonymous, e.g. `DMS-0042`; never a real name)
- `referral_received_at` (starts the 72-hour stage 1 clock), `hospital_name` (optional), `letter_text`
- `status` (`draft` | `in_progress` | `complete`), `claim_status` (`not_ready` | `ready` | `claimed`), `claimed_at`
- `is_demo` (boolean — synthetic public demo cases), `created_at`, `updated_at`

**dms_stages** — PROPOSED (alternative: columns on `cases`; see consult P6)
- `id` PK, `case_id` FK, `stage` (1 | 2 | 3), `completed_at`, `completed_by` FK → users, `notes`, `outcome` JSON

**medicines** (= TFS "things")
- `id` PK, `case_id` FK → cases
- `list_type` (`pre_admission` | `discharge` | `new_prescription`)
- `name`, `strength`, `form`, `dose`, `frequency`, `route`
- `dmd_code` (nullable, Tier 2), `source_text` (exact sentence from the document)
- `ai_confidence` (nullable), `edited_by_user` (boolean)

**reconciliation_items** (computed result, stored when a stage is approved)
- `id` PK, `case_id` FK, `stage` (1 | 2), `from_medicine_id` FK (nullable), `to_medicine_id` FK (nullable)
- `change_type` (`started` | `stopped` | `changed` | `unchanged`), `change_detail` (e.g. "dose 2.5mg → 5mg")
- `high_risk` (boolean), `pharmacist_note`

**high_risk_rules** (Tier 2, admin-managed)
- `id` PK, `match_term` (e.g. "warfarin"), `category`, `reason`, `active`

**audit_log** (Tier 2)
- `id` PK, `user_id` FK, `case_id` FK (nullable), `action` (e.g. `stage.approved`), `detail` JSON, `created_at`

Relationships: user 1—* cases; case 1—* medicines; case 1—* dms_stages; case 1—* reconciliation_items.

## 5. API endpoints (REST, prefix `/api`)

**Auth**
- `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`

**Cases** (logged in, own cases only; admin can see all)
- `GET /cases` (filter by stage/claim status, pagination) · `POST /cases` · `GET /cases/:id`
- `PATCH /cases/:id` (also used by autosave) · `DELETE /cases/:id`
- `POST /cases/:id/extract` — letter text (or file, Tier 2) → AI extraction → discharge list
- `POST /cases/:id/new-prescription/extract` — stage 2 prescription → AI extraction (Tier 2)
- `GET /cases/:id/reconciliation?stage=1|2` — computed comparison
- `POST /cases/:id/stages/:stage/complete` — approve a stage, store result, write audit entry
- `GET /cases/:id/claim-summary` — claim-ready record (Tier 2)
- `POST /cases/:id/mark-claimed`
- `GET /cases/:id/fhir` — FHIR UK Core export (Tier 3 stretch)

**Medicines**
- `POST /cases/:id/medicines` · `PATCH /medicines/:id` · `DELETE /medicines/:id`

**Public**
- `GET /demo-cases` · `GET /demo-cases/:id` (synthetic only, read-only)
- `GET /stats` (counts, most common changes, claims ready/value — no personal data)

**Admin (Tier 2)**
- `GET/POST/PATCH /admin/high-risk-rules` · `GET /admin/audit-log`

**Utility**
- `GET /health` · `GET /docs` (Swagger, Tier 3)

## 6. AI extraction contract
- Prompt instructs Claude to **extract only**: never infer, never advise, return `[]` if no medicines found.
- Response schema (Zod): `{ medicines: [{ name, strength?, form?, dose?, frequency?, route?, status_in_letter?: "new"|"stopped"|"changed"|"continued", source_text, confidence }] }`
- Invalid JSON → one retry → otherwise "Could not read this document — add medicines manually".
- Timeout and rate-limit handling with a clear UI message (no crash).
- Hallucination check: flag any line whose `source_text` isn't found in the original document.
- Discrepancy check (Tier 2): if the letter says "stopped" but code computes "unchanged", flag for review.

## 7. Security and privacy
**Prototype controls (built)**
- Synthetic data only; demo NHS numbers from the 999 test range
- Passwords hashed with bcrypt; JWT in httpOnly, Secure, SameSite cookie
- Role-based access checks on every route; users can only access their own cases
- All secrets in `.env` / host secret store; `.env` in `.gitignore`; the browser never holds any key
- Supabase: browser never connects directly; RLS enabled on all tables with deny-all for public roles
  (PROPOSED, consult P2); server-only connection string
- Input validation (Zod), parameterised SQL (no string-built queries), helmet, CORS allow-list,
  rate limiting on auth and AI routes
- CI: Dependabot + GitHub secret scanning; tests must pass before merge
- Redaction step (Tier 3 demo): strip names, NHS numbers, dates of birth, addresses before the AI call
- Audit log of approvals and edits

**Production path (slide, not built)**
- Identity: NHS Care Identity Service 2 (CIS2) instead of our own login
- Integration: receive referrals from existing referral platforms (e.g. PharmOutcomes), PMR integration,
  FHIR UK Core data exchange, automated MYS claim submission if/when an interface exists
- Data protection: UK GDPR special category data → DPIA, lawful basis, data processing agreements,
  data minimisation, retention policy; UK-hosted, zero-retention AI endpoint; encryption at rest
- Assurance: DSPT, DTAC, DCB0129/DCB0160 clinical safety, MHRA medical device assessment, penetration test

## 8. Hosting and deployment (CI/CD)
- **CI:** GitHub Actions on every push/PR: install → type-check → lint → unit tests → build. `main` protected.
- **CD:** client auto-deploys from `main` (preview deploys for PRs); API auto-deploys from `main`;
  migrations run as a controlled step.
- Client: Vercel or Netlify · API: Render (stretch: Google Cloud Run + Secret Manager) · DB/Storage: Supabase

## 9. Risks and mitigations
| Risk | Mitigation |
|---|---|
| AI misreads a medicine or dose | Source sentence shown for every line; pharmacist must approve; edits allowed; tests on sample letters |
| AI invents a medicine (hallucination) | Require `source_text`; flag lines whose source text isn't in the document |
| Real patient data entered by mistake | Clear warnings, redaction demo, synthetic-only policy |
| API key leak | Backend-only calls, `.env` ignored by git, secret scanning |
| Supabase Data API exposure | Deny-all RLS, no keys in the browser, server-only access |
| AI API down / slow / rate-limited | Timeouts, retry once, manual entry fallback, backup demo video |
| Free hosting sleeps / DB pauses before the demo | Wake services before presenting; scheduled ping; backup demo video |
| TypeScript slows a beginner down | Simple-types rule in CLAUDE.md; explain-and-log after every feature |
| Scope creep in 2.5 weeks | Tiers, deploy each tier, feature freeze ~5 days before the deadline |
| Regulatory misunderstanding | Clear "prototype, not a medical device" statement; production path slide |
| Can't explain the code in Q&A | Decision log; plain-English explanation after every feature; mock Q&A |

## 10. Open questions
- Exact deadline and presentation date (likely the afternoon engineer panel: 5 min + 2 min questions; to be confirmed)
- Does the tutor accept demo cases as the public "browse all" page?
- PMR list input: typed, pasted, or both?
- Which high-risk drug categories go in the first rules table?
- Exactly what information an MYS DMS claim requires (check with pharmacists / NHSBSA guidance)
- App name
- Plus everything in `consult-claude-code.md`
