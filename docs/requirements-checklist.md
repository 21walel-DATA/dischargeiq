# Requirements & Marking Checklist (target: Distinction in every area)

*Source: TFS Final Project brief, TFS Final Project Marking Scheme, Week 9 go-live and handover checklists.
Ignore any course calendar dates in those files; the owner's own timeline in CLAUDE.md applies.*

Grades: a higher grade includes everything below it. Overall Distinction = Merit in all five areas and
Distinction in at least three. **We aim for Distinction in all five.**

## 1. Planning and architecture
- [ ] Pass: architecture doc covers tech stack, data model and API endpoints → `docs/architecture.md`
- [ ] Merit: clear reasons for each choice; risks listed → stack table + risks table
- [ ] Distinction: **plan matches the finished app; changes are explained** → update `architecture.md`
      at the end to match what was built; every change logged in `docs/decisions.md`

## 2. Design
- [x] Pass: layouts for the main pages, **made before coding**
- [ ] Merit: **desktop AND mobile layouts for every page**; the app follows them
- [ ] Distinction: consistent, polished design; works well on any screen size
- How we prove "before coding": layouts saved in `docs/designs/` and **committed before any app code**
  (git history shows the order)

## 3. Build, API and hosting
- [x] Pass: working app using an API; code in GitHub; live
- [x] Merit: **own API and database; users, collections (cases) and items (medicines) all work;
      small, regular commits**
- [ ] Distinction: **live and reliable**; at least one extra → we do tests, API docs (Swagger), stats

## 4. Security and data
- [x] Pass: no API keys in front-end code or GitHub
- [x] Merit: keys in `.env` on the server; **`.gitignore` and `.env.example` in the repo**
- [ ] Distinction: **only collects data it needs; users can only change their own data;
      errors show no details** (generic error messages to users, no stack traces, details only in server logs)
- Go-live rules: secrets go in the host's environment settings; never put a secret in a `VITE_` variable
  (visible to anyone); no real personal data, no test accounts with real passwords

## 5. Presentation and understanding
- [ ] Pass: demo within the time limit; covers architecture, design and reflection
- [ ] Merit: planned demo journey; explains how the parts connect and why
- [ ] Distinction: **confident answers on the tech used, including AI-written code; honest, specific reflection**
- Format (confirmed): **afternoon panel of software engineers, Thu 19 Nov: 5 min presenting + 2 min questions**.
- Must cover: demo journey · architecture (database, languages, API, hosting and why) ·
  design (how the layout became the app) · reflection (what went well, what didn't, what I learnt)

## Handover checklist (repo must have)
- [ ] README: what the app does, live URL, tech stack, how to run locally, environment variable **names** (no values)
- [ ] `.env.example`, `.gitignore`
- [ ] `docs/`: brief, architecture, decisions, designs, user research
- [ ] Client guide (plain English, how to use the app) and developer handover notes
- [ ] **AI usage log** → `docs/ai-usage-log.md`
- [ ] **Test sheet with pass rate** → `docs/test-sheet.md`
- [ ] Clean code: no `console.log` with data, no dead or commented-out code, no test accounts
- [ ] Clean commit history; no key ever committed (if one was: revoke it)

## Go-live checklist
- [ ] Env vars set on hosts with the same names as `.env.example`; redeploy after changes
- [ ] No `localhost` URLs left in code; database URL set; CORS allows the live front end;
      correct build command and output folder
- [ ] Live URL works in a **private window** and **on a phone**, logged out and logged in
