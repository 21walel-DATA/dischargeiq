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

## D-007 — TypeScript instead of JavaScript (PROPOSED: Claude Code to review, consult P1)
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

## D-008 — Supabase PostgreSQL, accessed only by our own API (PROPOSED: consult P2)
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

## D-009 — DMS stage tracker with autosave (PROPOSED: consult P6)
- Date: 2026-11-12
- Decision: Each case tracks DMS stages 1–3 (72-hour target for stage 1), and every edit autosaves.
- Why: User research: losing progress unless saved as a draft is a key frustration, and the service is
  structured in three paid stages.
- Alternatives considered: Single "approved" status only (doesn't match the real workflow).

## D-010 — One comparison engine, reused for stage 2 (PROPOSED: consult P7)
- Date: 2026-11-12
- Decision: The comparison engine compares any two medicine lists; stage 2 compares the discharge list with
  the first new prescription.
- Why: A pharmacist reported a real error: a GP issued a prescription ignoring the hospital's change. Reusing
  one tested engine for two safety checks is less code and more reliable.
- Alternatives considered: Separate logic for stage 2 (duplicate code, more to test).

## D-011 — Claim-ready record and claims dashboard (PROPOSED: consult P8)
- Date: 2026-11-12
- Decision: Generate a claim-ready summary for NHSBSA Manage Your Service; show claims ready, value and
  unclaimed work. No automatic submission (no known public API); that's a production-path item.
- Why: User research: a pharmacist submits zero claims because the process is too convoluted. The app then
  saves time *and* recovers income (£35 per full DMS), a much stronger value for pharmacies.
- Alternatives considered: Leaving claims out (misses the strongest business case).

## D-012 — CI/CD from day one
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

## D-015 — Tools from a developer friend sent for review (PROPOSED: consult P10–P14)
- Date: 2026-11-12
- Decision: Tailwind + shadcn/ui themed with our tokens, Agentation (development only), Vercel's
  web-design-guidelines skill, Mermaid diagrams, and Vercel + Render + Supabase hosting are all sent to
  Claude Code for expert review before adopting.
- Why: Get a second expert opinion before changing the stack.
