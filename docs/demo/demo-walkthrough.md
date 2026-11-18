# Demo walkthrough: DMS-0042, live site

Live app: https://dischargeiq-pied.vercel.app · All data is synthetic.
**Every step below was run on the live site on 18 Nov 2026** with a throwaway account (live AI, not demo mode).

## Files in this folder

| File | Use |
|---|---|
| `dms-0042-letter.pdf` | Printable DMS-0042 discharge letter (same file the app offers as "sample PDF") |
| `dms-0042-letter-photo-blurred-dose.jpg` | Photo of the letter with the **amlodipine dose smudged**. Upload it → the AI writes `[unclear]` |
| `dms-0042-first-gp-prescription.md` | Synthetic first GP prescription (amlodipine still 5 mg) + exactly what to type for stage 2 |
| `photo-unclear-check.png` | What the `[unclear]` check screen looks like (reference) |
| `stage2-one-flag.png` | What stage 2 looks like with the prescription entered (reference) |

## Where things are on the screen

- **Stage tabs:** three boxes across the top of the case page: *Review discharge information*,
  *Check first new prescription*, *Consultation with patient or carer*. Each says its state underneath
  ("In progress", "Completed 18 Nov 17:23", "Not started"). **Click a box to switch stage.**
- **"Checked by" box:** in the middle **Change** column of any line marked **? Needs review**, under the yellow
  reason: `Checked by [ ] Required`. The `[ ]` is a dashed empty square: **click it** → a dialog "Check Zestril"
  opens → optional **Note** → **Add my initials (XX)**. The square then shows your initials (there's an undo link).
- **"Complete stage 1 / 2 / 3":** in the **bar stuck to the bottom of the screen**, right-hand side, next to
  "Mark as not applicable…". It stays **greyed out** while the bar says "N lines still need checking"; when it
  says "Nothing left to check" it becomes clickable. After completing, the app moves you to the next open stage.
- **Stage notes:** the "Stage N notes" box below the comparison. Saves itself ("Saved 17:24" appears top right).
- **Edit medicines or letter:** button under the notes box. Takes you to the edit page (letter, upload, and the
  three medicine lists, including **First new prescription (stage 2)** at the bottom).
- **Claim summary:** two ways in:
  1. On the case page, the green banner at the top **"Ready to claim. See the claim summary"** (appears once
     stage 1 is completed and no stage is still pending), or
  2. **Claims** in the top menu → *Claim work* table → click the case reference.
  The **Claim summary** panel lists each field with a **Copy** button, the "Claim by" dates, and **Mark as claimed**.

## The clicks, start to finish (one case, ~3 minutes if done live)

**Copy the case**
1. Log in → **Demo cases** (top menu) → open **DMS-0042** → **Copy to my cases**.
   You land on **Edit case DMS-0042 (copy)** with the letter already pasted and the 7 pre-admission medicines filled in.

**Optional: the blurred photo (~30 s, uses the live AI)**
2. Scroll to **Or upload the letter** → **Letter file**: choose `dms-0042-letter-photo-blurred-dose.jpg` →
   tick **This is a synthetic demo letter** → **Upload and copy out** (about 5 s).
3. Show: photo on the left, text on the right, **"1 part unclear"**, and the line
   *"Amlodipine increased to [unclear] mg once daily."* **Save and read the letter** is greyed out:
   *"Replace each [unclear] with what the letter says (1 left)."*
   Talking point: *the AI doesn't guess a dose; the pharmacist types what the letter says.*
4. Replace `[unclear]` with `10`, tick **I've checked this text against the uploaded letter**.
   (Or, if short of time, just skip to step 5: reload the page to throw the transcript away.)

**Stage 1**
5. **Save and read the letter** (a few seconds). You land on the case page, stage 1 comparison:
   **1 changed · 2 stopped · 1 started · 2 need review · 4 unchanged.**
6. Point at the lines: warfarin withheld, naproxen stopped, lansoprazole started, amlodipine 5 → 10 mg.
   Click **See the letter sentence and details** on one to show the exact sentence.
7. Two lines need review: **Zestril** (brand/generic of lisinopril) and **Paracetamol** (1 g vs 500 mg × two).
   For each, click the **Checked by** square → note e.g. *"Same dose, confirmed with the patient"* → **Add my initials**.
8. Bottom bar now says "Nothing left to check" → **Complete stage 1**. You're moved to stage 2.

**Stage 2**
9. Stage 2 says "When the first new prescription after discharge arrives…" → **Add the new prescription**.
10. At the bottom of the edit page, **First new prescription (stage 2)**: add the 6 medicines from
    `dms-0042-first-gp-prescription.md` (Medicine / Strength / Dose / How often → **Add medicine**, one at a time).
11. **Go to comparison** (bottom of edit page) → click the **Check first new prescription** stage box.
12. Result: **1 changed · 1 needs review · 5 unchanged.** Amlodipine: *"Strength 10 mg → 5 mg. The new
    prescription differs from the discharge list: check with the prescriber."*
    Talking point: *same comparison engine as stage 1, now catching the GP repeat that missed the hospital's change.*
13. **Checked by** → note *"GP surgery contacted: prescription updated to 10 mg"* → **Add my initials** →
    **Complete stage 2**.

**Stage 3**
14. Type in **Notes for this stage**, e.g. *"Talked through the changes with the patient: warfarin withheld,
    naproxen stopped, new lansoprazole, amlodipine now 10 mg."* Wait for "Saved".
15. **Complete stage 3**. Green banner: **Ready to claim. See the claim summary.**

**Claim**
16. **See the claim summary** → panel *Claim summary: DMS-0042 (copy)*: Referral received, Referring hospital,
    Stage 1/2/3 dates, each with **Copy**; "Claim by 5 Mar 2027. Claim by 5 Dec 2026 for the earliest payment."
    Talking point: *the pharmacist who submitted zero claims now has every field ready to paste into MYS.*
17. **Don't press "Mark as claimed"** unless it's the very last click: it **locks the case** (can't be undone),
    so you couldn't show it again.

## Preparing 3 cases tonight with your presenter account

Each **Copy to my cases** makes a new case: `DMS-0042 (copy)`, then `(copy 2)`, `(copy 3)`.
Make them in the order C, B, A below, so the names match: C = `(copy)`, B = `(copy 2)`, A = `(copy 3)`.
*My cases* lists the most recently changed case first, so pick them by name, not by position.

**Case C: all stages done, claim-ready** (make it first)
1. Demo cases → DMS-0042 → **Copy to my cases** → this is **DMS-0042 (copy)**.
2. Do steps 5–15 above (skip the photo). Stop at the green **Ready to claim** banner.
3. Don't press **Mark as claimed**. Open the claim summary once to check it shows.

**Case B: stage 1 done, ready for stage 2**
1. Copy again → **DMS-0042 (copy 2)**.
2. Steps 5–8 (read letter, check Zestril + paracetamol, **Complete stage 1**).
3. Recommended so the live demo is quick: on the edit page add **5 of the 6** prescription medicines now
   (all except Amlodipine). In the demo you only type **Amlodipine / 5 mg / once daily**, click
   **Add medicine**, then **Go to comparison** → stage 2. (Typing all 6 live takes ~1.5 minutes.)
4. Check it now: add amlodipine 5 mg, confirm stage 2 shows exactly **1 needs review**, then **delete Amlodipine**
   from the prescription list (Delete Amlodipine button) so it's ready to add again live.
   If anything else is flagged, the AI worded the discharge list slightly differently: fix your typed line to
   match **Medicines on discharge** (see the prescription file).

**Case A: fresh**
1. Copy again → **DMS-0042 (copy 3)**. Leave it on the edit page with the letter pasted. Nothing else.
   In the demo: (optional photo) → **Save and read the letter** → show the stage 1 comparison and one check.

**Suggested 5-minute flow:** Case A (read the letter, the comparison, one Checked by, maybe the blurred photo) →
Case B (add amlodipine 5 mg, stage 2 flag) → Case C (claim summary, Claims page stats).

**Backup if the AI or network is slow on the day:** Case A's letter can't be read without the AI, but Cases B and C
are already prepared and show everything after reading. The stage 1 timer ("Stage 1: N hours left") counts from
when you copy the case, so cases copied tonight will still be well within 72 hours tomorrow afternoon.

## Not tested
- Renaming a copy (e.g. to "Case A") via **Case reference** on the edit page: the field is there but I didn't try it.
- Step 4 path *after* typing `10` over `[unclear]`: not re-run today; the same path passed in D-055, and with `10`
  typed the text is identical to the pasted letter that was read successfully in step 5.
