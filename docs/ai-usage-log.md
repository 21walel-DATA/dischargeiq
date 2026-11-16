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
| | | | | |
