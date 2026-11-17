# DischargeIQ: submission summary

Individual bootcamp final project (TFS Vibe Coding Web App, Route A), submitted 17 Nov 2026.

- **Live app:** https://dischargeiq-pied.vercel.app (no account needed: open **Demo cases**)
- **Repository:** https://github.com/21walel-DATA/dischargeiq
- **API docs:** https://dischargeiq-pied.vercel.app/api/docs

> Prototype. Synthetic data only. Not a medical device. It supports the pharmacist's decision; it never makes one.

## What it is
A web app for community pharmacy teams doing **NHS Discharge Medicines Service (DMS)** referrals. The pharmacist
enters the patient's medicines from before admission and the hospital discharge letter (pasted, or uploaded as a
PDF or photo). **AI reads** the letter and lists its medicines, quoting the sentence each came from; **plain, tested
code compares** the two lists (Started / Stopped / Changed / Unchanged, plus "Needs review" and high-risk flags);
the **pharmacist approves** each of the three DMS stages. It ends with a claim-ready record and a claims page.

## The problem and user research
A pharmacist questionnaire (n = 1 so far, so treated as hypotheses): comparing a discharge letter with the
patient's record takes **15–20 minutes per referral** and disrupts other work; spotting what changed is the hardest
part; a real error was seen (a GP prescription ignored a change made in hospital); and the pharmacist submits
**no DMS claims at all** (up to £35 each) because claiming is too convoluted. Details: `docs/user-research.md`.

## Deliverables and where to find them
| Deliverable | Where |
|---|---|
| Live app, live API, API docs | Links above. Uptime monitored every 5 minutes (`/api/health`) |
| Source code | Repository: `client/` (React), `server/` (Express API), `shared/` (Zod schemas) |
| Brief | `docs/brief.md` (attached as **brief.pdf**) |
| Architecture (database, API, hosting, security) | `docs/architecture.md` (attached as **architecture.pdf**) |
| Page designs, desktop + mobile | `docs/designs/` (attached as **designs.pdf**); first 8 committed before any app code |
| Design system | `docs/design-system.md` ("Dispensing label") |
| Decision log (57 decisions, with alternatives) | `docs/decisions.md` |
| Clinical hazard log (10 hazards, scores reviewed by the owner) | `docs/hazard-log.md` |
| Test sheet with pass rate | `docs/test-sheet.md` |
| AI usage log (including the AI's mistakes) | `docs/ai-usage-log.md` |
| README, client guide, developer handover | `README.md`, `docs/client-guide.md`, `docs/developer-handover.md` |
| Requirements checklist with evidence | `docs/requirements-checklist.md` |

## Key evidence
- **203 automated tests** (Vitest + Supertest against a real Postgres): the comparison engine (written first),
  login, **ownership on every case and medicine route** (another user gets 404), the NHS number guard, the stage
  approval gate, uploads, the AI failing, and error handling. CI runs typecheck, lint, tests and build on every push.
- **Manual test run on the live site: 42 / 42 passed on the first run** (desktop private window and phone,
  logged in and out; 15 user flows on both, 5 failure cases, 7 upload checks). No fixes needed.
- **Accessibility:** Lighthouse accessibility, best practices and SEO **100** on all 8 runs (4 pages, mobile and
  desktop); **axe: 0 violations** after one fix. Every status stays distinguishable under deuteranopia,
  protanopia and achromatopsia emulation (word + shape + colour).
- **Independent security review** of the whole repository: no high-confidence vulnerabilities. Own JWT login in an
  `HttpOnly; Secure; SameSite=Lax` cookie, bcrypt, parameterised SQL, rate limits, errors and logs never show
  internal details, full git history scanned for secrets.
- **Clinical safety:** hazard log in DCB0129 style; real NHS numbers refused everywhere (only the 999 test range);
  every AI answer checked with a Zod schema; a quoted sentence not found in the letter is flagged; a stage can't be
  completed until every flagged line is checked (enforced on the server).

## How AI was used
Claude Code (an AI coding assistant) wrote most of the code, under rules I set (`CLAUDE.md`): plan before code,
tests for the logic, an explanation and a decision-log entry after every feature, and beginner-readable
TypeScript. I made the product, clinical and design decisions, wrote the clinical content (demo cases,
high-risk list, hazard scores), ran the live tests and checked its work. 67 of the 70 commits before this pack are co-authored by it.
What it suggested, what I kept, changed or rejected, and its mistakes are in **`docs/ai-usage-log.md`**.
Inside the app, the Claude API only reads letters; it never compares or advises.

## Honest limitations
Synthetic data only, no audit log or dm+d codes, login tokens can't be revoked early, research is n = 1, and the
time saving hasn't been measured with pharmacists yet. A real version would need UK hosting, a DPIA, an
information governance review and likely medical-device (MHRA) assessment. See `docs/developer-handover.md`.
