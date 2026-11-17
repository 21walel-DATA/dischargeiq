# Requirements & Marking Checklist (target: Distinction in every area)

*Source: TFS Final Project brief, TFS Final Project Marking Scheme, Week 9 go-live and handover checklists.
Ignore any course calendar dates in those files; the owner's own timeline in CLAUDE.md applies.*

Grades: a higher grade includes everything below it. Overall Distinction = Merit in all five areas and
Distinction in at least three. **We aim for Distinction in all five.**

*Ticked 17 Nov 2026 only where there is evidence (shown after each item). Unticked items say what is missing.*

## 1. Planning and architecture
- [x] Pass: architecture doc covers tech stack, data model and API endpoints → `docs/architecture.md`
      (sections 3, 4 and 5)
- [x] Merit: clear reasons for each choice; risks listed → stack table (section 3) + risks table (section 10)
- [x] Distinction: **plan matches the finished app; changes are explained** → `architecture.md` v1.0 rewritten
      against the code on 17 Nov; every change logged in `docs/decisions.md` (D-001 to D-055)

## 2. Design
- [x] Pass: layouts for the main pages, **made before coding** → `8ee43d7` (16 Nov 18:00) before the first app
      code `b9065e1` (16 Nov 21:25)
- [x] Merit: **desktop AND mobile layouts for every page**; the app follows them → 11 screens × 2 in
      `docs/designs/`. The 8 planned pages were designed before any code; 3 small screens added during the build
      (`/status`, the 404 page, the letter-upload check view) got their wireframes **after** the code, labelled as
      such in `docs/designs/README.md` (D-057)
- [x] Distinction: consistent, polished design; works well on any screen size → one token file
      (`tokens.css`); Lighthouse accessibility 100 and 0 axe violations on 4 pages × phone and desktop; checked at
      360/375/390 px and desktop; every status readable under colour-blindness emulation (`docs/test-sheet.md`).
      Polish is ultimately the panel's judgement
- How we prove "before coding": layouts saved in `docs/designs/` and **committed before any app code**
  (git history shows the order)

## 3. Build, API and hosting
- [x] Pass: working app using an API; code in GitHub; live
- [x] Merit: **own API and database; users, collections (cases) and items (medicines) all work;
      small, regular commits**
- [x] Distinction: **live and reliable**; at least one extra → extras: 203 automated tests, Swagger API docs,
      claims and stats, PDF/photo upload. Reliable: an UptimeRobot monitor checks
      https://dischargeiq-pied.vercel.app/api/health every 5 minutes (status Up, set up by the owner 17 Nov). That
      route goes through Vercel to the API and runs `SELECT 1` on the database, so it keeps the free Render API and
      Supabase awake and alerts if any part goes down; CI must pass before every deploy

## 4. Security and data
- [x] Pass: no API keys in front-end code or GitHub
- [x] Merit: keys in `.env` on the server; **`.gitignore` and `.env.example` in the repo**
- [x] Distinction: **only collects data it needs; users can only change their own data;
      errors show no details** → users table holds email, display name and a bcrypt hash only; ownership tested on
      every case and medicine route (`ownership.test.ts`, `cases.test.ts`, `stages.test.ts`, `transcribe.test.ts`);
      `errors.test.ts` proves users get no details and the server log gets no request values; independent security
      review 17 Nov found no high-confidence vulnerabilities
- Go-live rules: secrets go in the host's environment settings; never put a secret in a `VITE_` variable
  (visible to anyone); no real personal data, no test accounts with real passwords

## 5. Presentation and understanding
- [ ] Pass: demo within the time limit; covers architecture, design and reflection
- [ ] Merit: planned demo journey; explains how the parts connect and why
- [ ] Distinction: **confident answers on the tech used, including AI-written code; honest, specific reflection**
- Not yet: the presentation is on Thu 19 Nov. Q&A material is in `docs/decisions.md` ("How I'd explain it in
  30 seconds") and the explain-and-log notes.
- Format (confirmed): **afternoon panel of software engineers, Thu 19 Nov: 5 min presenting + 2 min questions**.
- Must cover: demo journey · architecture (database, languages, API, hosting and why) ·
  design (how the layout became the app) · reflection (what went well, what didn't, what I learnt)

## Handover checklist (repo must have)
- [x] README: what the app does, live URL, tech stack, how to run locally, environment variable **names** (no values)
      → also screenshots and how to run the tests
- [x] `.env.example`, `.gitignore` → `server/.env.example`, `client/.env.example`, `.gitignore`
- [x] `docs/`: brief, architecture, decisions, designs, user research
- [x] Client guide (plain English, how to use the app) and developer handover notes → `docs/client-guide.md`,
      `docs/developer-handover.md`
- [x] **AI usage log** → `docs/ai-usage-log.md` (including the AI's mistakes)
- [x] **Test sheet with pass rate** → `docs/test-sheet.md`: owner's live run on 17 Nov (desktop private window +
      phone) plus the upload checks: **42 / 42 = 100% on the first run, no fixes needed**. F6 and F7 are
      covered by automated tests (`aiFailure.test.ts`, `errors.test.ts`).
      Accessibility, colour-vision and upload sections are filled in
- [ ] Clean code: no `console.log` with data, no dead or commented-out code, no test accounts.
      Code: done 17 Nov (`ad0db86`: logs carry only safe error summaries; no TODOs or commented-out code; the unused
      `acknowledged_review_keys` column is documented). **Not yet met: no test accounts.** The owner deletes
      their own test accounts tonight (Tue 17 Nov), before submitting; tick this once the owner confirms
- [x] Clean commit history; no key ever committed → full-history scan 17 Nov found no API keys or real connection
      strings (only made-up ones inside tests); secret scanning + push protection on. The 16 Nov password exposure
      was in a chat, not git, and the password was rotated (D-041)

## Go-live checklist
- [x] Env vars set on hosts with the same names as `.env.example`; redeploy after changes → live API reaches the
      database (`/api/health` ok), runs the live AI (`/api/ai/status` = `live`) and signs logins
- [x] No `localhost` URLs left in code (the only mention is a code comment); database URL set; CORS allows the live
      front end (not needed: the browser only talks to one origin through the Vercel rewrite); correct build
      command and output folder (both hosts deploy from `main`)
- [x] Live URL works in a **private window** and **on a phone**, logged out and logged in → owner's final run on
      17 Nov: every user flow passed in a desktop private window and on the owner's phone, logged out and logged in
      (`docs/test-sheet.md`)
