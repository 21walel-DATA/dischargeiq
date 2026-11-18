# User Research

*Status: questionnaire sent 2026-11-04. 1 written response so far (12 Nov 2026). More responses wanted
before the findings are presented as patterns.*

## Goal
Validate that DMS list comparison is a real pain point, learn the current workflow, and find out what
would make pharmacists trust an AI-assisted tool.

## Evidence so far
- **Owner's experience:** pharmacy graduate (overseas degree) with 15 years in UK community pharmacy and NHS primary care, as a dispenser, pharmacy team leader and pharmacy team assistant (last worked in pharmacy ~2+ years ago).
  PharmOutcomes remembered as slow, hard to navigate and time-consuming.
- **Practising pharmacist (friend), Nov 2026:** "Yes, we have to compare the list, and it's time consuming."
- **Respondent 1 (written questionnaire, 12 Nov 2026):** see the table and findings below.

## Questionnaire (sent to pharmacists)
1. Roughly how many DMS / discharge referrals does your pharmacy get in a week?
2. How do they usually arrive (PharmOutcomes, NHSmail, paper, other), and in what format?
3. Who usually handles them: pharmacist, technician, or both?
4. Roughly how long does it take to compare one discharge list with the patient's PMR record?
5. What's the most frustrating part: reading the letter, spotting what changed, updating the PMR, or something else?
6. Have you seen an error slip through? (Type of error only.)
7. Which changes worry you most when checking?
8. Would you trust a tool showing started / stopped / changed / unchanged, each linked to the letter sentence? What would increase trust?
9. How do you feel about AI reading discharge letters? Any concerns?
10. Desktop, tablet or phone?
11. What output do you want at the end (printout, notes for PMR, DMS claim record, other)?
12. If you could fix one thing about the discharge process, what would it be?
13. Anything else I should have asked?
14. **(New, suggested by respondent 1)** How many DMS claims does your pharmacy submit each month?
    If fewer than the DMS work you complete, why?

## Responses
| # | Referrals/week | Arrive via | Handled by | Time per comparison | Biggest pain | Errors seen | Main worry | Trust factors | AI concerns | Device | Wanted output | Claims/month |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 5 | PharmOutcomes | Pharmacist | 15–20 min, "causes delay to other jobs and disruption" | Spotting what changed | Yes: GP issued a prescription disregarding the change after discharge | High-risk drugs | "If it's tried, tested, approved or endorsed" | "No concerns, it's part of life now" | Any, "providing all have a secure connection" | A record for the DMS claims | **Zero**: "it wastes time" |
| 2 | | | | | | | | | | | | |
| 3 | | | | | | | | | | | | |

**Respondent 1, Q12 (one fix):** "Less convoluted, less complicated, fewer steps to complete the claim:
currently 3 steps to complete. Have to save as a draft or progress lost. I often don't do it because it's a
waste of time for the money." **Q13:** "I will claim if it was a simpler process." Also described the
stages and fees: (1) summary of prescription received, (2) new prescription issued, £11, (3) discuss with
the patient so they understand the change, £12.

## Key findings (so far, n = 1; treat as hypotheses until confirmed)
- Comparison is slow (15–20 min) and disruptive, and **spotting changes** is the main pain.
- A real safety error happens at **stage 2** (new prescription ignoring the hospital's change).
- **High-risk drugs** are the main worry, which supports rule-based high-risk flags.
- **Unclaimed income:** claiming is so painful this pharmacist claims nothing. At £35 per full DMS and
  about 5 referrals a week, that's up to roughly £9,000 a year for one pharmacy (an upper bound).
- Trust comes from testing and endorsement, not from the AI itself.

## Design changes driven by research (log in decisions.md)
- DMS stage tracker with autosave (no lost progress) → D-009
- Stage 2 re-check using the same comparison engine → D-010
- Claim-ready record and claims dashboard → D-011
- Emphasise tests, CI and the pharmacist approval step in the pitch (trust)
