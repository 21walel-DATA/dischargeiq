# Project Brief — DischargeIQ (working title)

*Route A brief for tutor approval. Status: DRAFT (to be refined after user research and a "grill me" session).*

## The idea in one line
A web app that turns a hospital discharge letter into a clear, reviewable list of medication changes,
guides the pharmacist through the three stages of the NHS Discharge Medicines Service (DMS), and ends with
a claim-ready record, so pharmacies complete DMS faster, more safely, and actually get paid for it.

## The problem
- When patients leave hospital, their medicines often change. Since February 2021, community pharmacies
  in England provide the **NHS Discharge Medicines Service**: the pharmacist compares the medicines at
  discharge with what the patient took before admission, checks the first new prescription, and speaks
  to the patient. Each fully completed DMS pays the pharmacy **£35** (£12 + £11 + £12).
- Today the comparison is manual: reading free-text letters and cross-checking line by line against the PMR.
- User research (see `user-research.md`):
  - comparison takes **15–20 minutes per referral** and "causes delay to other jobs and disruption"
  - the most frustrating part is **spotting what changed**
  - a real error was seen: **a GP issued a prescription disregarding the change after discharge**
  - one pharmacist submits **zero DMS claims** because the claim process is convoluted (three steps,
    progress lost unless saved as a draft): *"I will claim if it was a simpler process."* At about five
    referrals a week, that's up to roughly £9,000 a year unclaimed in one pharmacy.
- Missed changes can cause avoidable harm; unclaimed work means pharmacies lose income for work they've done.

## Why me
I'm a former community pharmacist now working in the NHS and retraining in software and data.
I understand the clinical workflow and its safety risks, and I've designed the app around them.

## Users
- **Pharmacist** (primary): creates cases, reviews and approves reconciliations.
- **Pharmacy technician** (future): prepares cases for pharmacist review.
- **Admin**: manages users, high-risk drug rules, views stats.
- **Visitor**: can view the home page and a synthetic demo case.

## How it fits the TFS brief
- Each **user** has multiple **collections** → *discharge cases*
- Each **collection** has multiple **things** → *medicines* (before-admission and on-discharge lists)
- Adaptation: "Browse all things" becomes a **public library of synthetic demo cases** (real cases
  must stay private for confidentiality). *To confirm with tutor.*

## Main features
**Core (Tier 1)**
- Register / log in with roles
- Create, edit, delete discharge cases (pseudonymous reference, never a real name)
- Add the pre-admission medicine list (typed or pasted)
- Paste the discharge letter → AI extracts medicines → app shows STARTED / STOPPED / CHANGED / UNCHANGED
- Pharmacist approves the reconciliation
- **DMS stage tracker**: each case moves through stages 1–3, with a 72-hour countdown for stage 1
- **Autosave** everywhere, so progress is never lost

**Differentiators (Tier 2)**
- **Stage 2 re-check**: the same comparison engine checks the first new prescription against the
  discharge list, catching changes the GP missed
- **Claim-ready record**: one screen with everything needed to claim on NHSBSA Manage Your Service
- Upload PDF or photo of the letter (AI vision)
- Click any medicine to see the exact sentence it came from (traceability)
- Match medicines to official NHS dm+d codes
- High-risk medicine flags written from pharmacy knowledge (rule-based, not AI)
- Discrepancy alerts when the letter's wording and the computed comparison disagree
- Audit log of who approved what and when

**Polish (Tier 3)**
- **Claims dashboard**: claims ready, their value, unclaimed this month; plus stats
- FHIR (UK Core) export of a reconciliation (NHS interoperability), API documentation,
  performance/cost telemetry, redaction demo, accessibility audit

## APIs
- **Own API** (Node/Express + TypeScript) on a **Supabase PostgreSQL** database: the central database
- **Anthropic Claude API** — extraction of medicines from letter text/images, called only from the backend
- **NHS dm+d data** (via TRUD, free registration) — official medicine codes *(Tier 2)*

## Pages
Each page has a desktop and a mobile layout, designed before coding.
1. Home (problem, how it works, link to demo cases, prototype/safety notice)
2. Log in / Register
3. Demo cases: browse all (public, synthetic)
4. My cases (dashboard with stage and claim status): logged in
5. New / edit case form (pre-admission list + discharge letter)
6. Case detail: the reconciliation view and DMS stages (the main screen)
7. Medicine detail (source sentence, change, flags)
8. Claims & stats (claim-ready cases, value, unclaimed, app statistics)

## Safety & scope statement
Prototype for education using **synthetic data only**. It supports, and never replaces, a pharmacist's
clinical judgement. A real deployment would require MHRA medical device assessment, DCB0129/DCB0160
clinical safety, DSPT and DTAC.

## Timeline
Planning started 3 Nov 2026. Build sprint Mon 16 to Tue 17 Nov 2026: live and handed over by Tuesday night.
Features beyond the sprint (PDF upload, dm+d matching, audit log, FHIR export) go on the "what's next" slide.
