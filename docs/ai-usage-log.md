# AI Usage Log

*Required for handover. Claude Code: add an entry whenever an AI suggestion mattered, was changed or
was rejected. Keep entries short.*

## Tools used
- **Claude (claude.ai Project):** idea generation, product strategy, architecture, user research
  questionnaire, planning docs, custom skills
- **Gemini:** early idea brainstorming (several claims were fact-checked and corrected; see below)
- **Claude Code (VS Code terminal):** code, tests, deployment, documentation
- **Claude API (inside the app):** extracting medicines from discharge letters (backend only)

## How AI output was checked
- Clinical logic checked against the owner's pharmacy knowledge; AI never makes clinical decisions in the app
- Facts and figures checked against sources (e.g. DMS fees from Community Pharmacy England)
- Code checked by TypeScript, unit tests, CI on every push, and plain-English explanations (explain-and-log)
- Third-party tools reviewed with the skill-safety-check skill before installing

## Log
| Date | Tool | What I asked / what it produced | What I kept, changed or rejected | How I checked it |
|---|---|---|---|---|
| 2026-11-03 | Gemini | Project ideas and a technical plan | Rejected US-only terms (HIPAA, BAAs), "100% compliant/unhackable" claims, unsourced statistics; kept the discharge-letter idea | Fact-checked with Claude and web sources |
| 2026-11-03 | Claude | Idea review | Chose DMS reconciliation; rejected SSP navigator and prescriber bridge (existing systems already do it) | My pharmacy experience |
| 2026-11-12 | Claude | Analysis of pharmacist feedback | Added DMS stage tracker and claim record features | Pharmacist's written answers; CPE fee data |
| 2026-11-12 | Claude | Token-saving "caveman" skill | Rejected (≈1–3% real saving, worse explanations) | Independent benchmarks |
| 2026-11-16 | Claude Code | Expert review of the 15 proposed decisions (`consult-review.md`). Main suggestions: `pg` via Supabase's IPv4 session pooler; Vercel `/api` rewrite so login cookies are first-party; plain CSS + CSS Modules instead of Tailwind/shadcn; separate `dms_stages` table with a status per stage; exact normalised matching with no fuzzy matching; claim summary only (no public MYS API); hazard log; NHS number guard; cut admin UI then Swagger | **Accepted all**, plus my own change: stage status includes "not applicable", and a claim is ready when all applicable stages are complete. Rejected the original Tailwind + shadcn and Agentation proposals for the sprint (D-016 to D-031) | Checked against my pharmacy knowledge; claim/API facts checked with CPE, Greater Manchester LPC and the NHSBSA tender notice (cited in the review); still to verify the current MYS claim fields |
| 2026-11-16 | Claude Code | Three design directions (dispensing label, prescription form, blister pack), then the design system and wireframes for all 8 pages | Chose the dispensing label, used pure. Changed the brand colour myself: the proposed green clashed with the Started status green, so the brand became Amber bottle brown. Deferred the endorsement margin (D-033) | Checked the design against the skill's AI-tell list and WCAG contrast; reviewed every screenshot at desktop and mobile size |
| 2026-11-16 | Claude Code | Diagnosing why the main database connection failed | **Mistake:** Claude Code printed a redacted Supabase error message, but the redaction missed part of a malformed connection string and the main DB password appeared in the chat. Owner rotated the password immediately; nothing reached git. Rule added: diagnostics print only error codes and yes/no facts (D-041) | Owner reset the password; new connection verified with a code-only check |
| | | | | |
