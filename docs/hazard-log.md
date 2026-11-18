# Clinical Hazard Log (starter) — DischargeIQ

**Risk scores drafted by AI and reviewed by the owner (pharmacy graduate with 15 years in UK community pharmacy and NHS primary care; not a registered pharmacist) on 17 Nov 2026.**

*Prototype, synthetic data only. Written in the style of **DCB0129** (clinical risk management for
manufacturers of health IT). A real deployment would need a Clinical Safety Officer, a full hazard log and a
clinical safety case report. Decision: D-029. Started 16 Nov 2026; update as features are built (Phase 4).*

**Scoring (simplified DCB0129 style):** Severity 1 (minor) – 5 (catastrophic) × Likelihood 1 (very low) –
5 (very high) = Risk. "Before" is without the control; "After" is with it.

| ID | Hazard | Cause | Effect on patient | Controls in the design | Proving test / evidence | Risk before → after | Status |
|---|---|---|---|---|---|---|---|
| H1 | A real medication change is not shown | AI misses a line in the letter; engine wrongly labels it UNCHANGED | Patient continues a stopped drug or misses a new one | Source sentence per line; pharmacist reviews the letter beside the list; engine never hides differences (missing fields → needs review) | Reconciliation unit tests (edge cases 5, 7, 8, 9, 10); test sheet #8 | 4×3=12 → 4×2=8 | Open |
| H2 | Two different drugs paired as the same | Fuzzy / look-alike name matching (e.g. hydralazine vs hydroxyzine) | Wrong drug's change applied | **No fuzzy matching**; exact normalised names; unpaired lines shown as STOPPED + STARTED or needs review (D-022) | Unit test: look-alike names are never paired | 5×3=15 → 5×1=5 | Open |
| H9 | An uncertain line is approved without being checked | Engine can't decide (possible brand/generic match like Zestril vs lisinopril, duplicate drug, missing strength) and the pharmacist doesn't notice | A missed or wrong change reaches the patient | **"Needs review" badge with the reason** on the line; **stage completion blocked until every flagged line is acknowledged**, enforced on the server (409); editing a medicine resets its acknowledgement (D-032) | API test: complete with an unacknowledged flag → 409; after acknowledging → 200. Component check: badge and reason visible | 4×3=12 → 4×1=4 | Open |
| H3 | AI invents a medicine (hallucination) | Model output not grounded in the letter | Patient started on a drug never prescribed | Required `source_text`; lines whose source isn't found in the letter are flagged; Zod validation; pharmacist approval | Unit test: fake `source_text` → flagged | 4×2=8 → 4×1=4 | Open |
| H4 | Wrong dose, strength or frequency shown | Unit/abbreviation mix-ups (micrograms vs mg; weekly vs daily) | Over- or under-dosing (e.g. methotrexate daily instead of weekly) | Unit and frequency normalisation; strength/frequency differences → CHANGED; methotrexate flagged high-risk | Unit tests (edge cases 3, 4, 10) | 5×3=15 → 5×1=5 | Open |
| H5 | GP's first new prescription ignores the hospital change | Stage 2 check skipped or not compared | Patient receives the pre-admission regimen again | Stage 2 re-check with the same engine; stage can't be "completed" silently; mismatches highlighted | Test sheet #11; engine unit tests (shared) | 4×3=12 → 4×2=8 | Open |
| H6 | Pharmacist's review work lost | Page closed / connection dropped before saving | Stage repeated late or skipped; 72-hour target missed | Autosave (debounced PATCH + on blur), visible "Saved / Couldn't save" status, warning before leaving | Test sheet #13 | 3×3=9 → 3×1=3 | Open |
| H7 | Information shown for the wrong patient | Ownership bug or wrong case loaded | Decisions made on another patient's medicines | Ownership checks in SQL on every route; pseudonymous case reference shown on every screen | API tests: another user's case → 403/404; test sheet F3 | 5×2=10 → 5×1=5 | Open |
| H10 | A real discharge letter is uploaded by mistake (privacy) | A pharmacist photographs or uploads a real patient's letter instead of a synthetic one (D-054) | Real patient data (name, address, NHS number, medicines) sent to the AI provider and possibly saved in the case | **"This letter is synthetic" tick box** before upload; file held **in memory only**, never stored; transcribed text run through the **NHS number guard** on the server (real number → text discarded) and again on save; synthetic-only warnings. **Production would need an information governance review and a DPIA** (plus contract terms with the AI provider) before real letters are allowed | `server/tests/transcribe.test.ts`: upload without the tick → 400; transcript with a real NHS number → discarded; nothing saved to the case; test sheet "Letter upload" | 3×3=9 → 3×2=6 (severity 3 × likelihood 2; owner's reasoning: controls reduce the chance of a real letter being uploaded, not the harm if it is) | Open |
| H8 | Over-reliance on the tool | User trusts the output without checking | Any of the above reaches the patient | "Supports, never decides" wording; pharmacist must approve each stage; every "Needs review" line must be acknowledged before approval (D-032); no AI clinical advice (golden rule 4) | Review of UI copy; demo script | 4×3=12 → 4×2=8 | Open |

## Notes
- Real patient data entering the prototype is a **privacy** risk rather than a clinical one; it is controlled
  by the NHS number guard (D-030) and the synthetic-only policy.
- Risk scores were a first draft by Claude Code. **Reviewed by the owner (pharmacy graduate with 15 years in UK community pharmacy and NHS primary care) on
  17 Nov 2026:** all scores agreed; H10's reasoning rewritten (the after-controls score stays severity 3 ×
  likelihood 2 = 6, because the controls lower the chance of a real letter being uploaded, not the harm if one is).
