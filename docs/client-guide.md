# DischargeIQ: a guide for pharmacists

DischargeIQ helps you work through a **Discharge Medicines Service (DMS)** referral: it compares the patient's
medicines before admission with the hospital discharge letter, helps you check the first new prescription, and
gives you a claim-ready record for Manage Your Service (MYS).

> **This is a prototype. Use synthetic (made-up) patients only.** Never enter a real name, address, date of birth
> or NHS number. The app refuses real NHS numbers; test numbers starting 999 are allowed.
> It is not a medical device: it helps you check, and every decision is yours.

App: https://dischargeiq-pied.vercel.app. It works on a computer, a tablet or a phone. The first visit after a
quiet spell can take up to a minute while the server wakes up.

---

## 1. Try it without an account
Choose **Demo cases**. These are made-up referrals you can look at straight away: open one to see a finished
comparison. To work through one yourself, log in and choose **Copy to my cases** (see section 9).

## 2. Create an account and log in
Choose **Log in**, then **Create an account**. You need an email, a display name and a password of at least 12
characters. Your display name's initials appear when you check a line or complete a stage, like initialling a
dispensing label. You stay logged in for about one shift (8 hours).

## 3. Start a case
1. Go to **My cases** and choose **Create a case**.
2. **Case reference:** your own code, for example `DMS-0101`. **Never** the patient's name or NHS number.
3. **Referral received:** when the referral arrived. This starts the 72-hour target for stage 1.
4. **Hospital** (optional) and, if you have it, the discharge letter (see section 5).
5. Choose **Create case**.

## 4. Add the medicines from your PMR
On the case, under **Medicines before admission**, add each medicine the patient was on before going into hospital:
the name, strength, dose and how often. Choose **Add medicine** after each one. You can change or delete a line
later.

## 5. Add the discharge letter
You have two ways:

**Paste it.** Copy the letter's text into **Paste the discharge letter**.

**Or upload it** (a PDF or a photo, up to 4 MB):
1. Under **Or upload the letter**, choose the file.
2. Tick **This is a synthetic demo letter**. Real letters must not be uploaded to this prototype.
3. Choose **Upload and copy out**. After a few seconds the letter appears as text, with your file beside it.
4. **Check the text against the letter**, especially medicine names, doses and units. Correct anything that's wrong.
5. Wherever the app couldn't read something (a smudge, a fold), it writes **[unclear]** instead of guessing.
   Replace each one with what the letter says. You can't continue while any [unclear] is left.
6. Tick **I've checked this text against the uploaded letter**.

The file itself is never saved; only the text you checked is kept.

## 6. Read the letter
Choose **Save and read the letter**. The app lists the discharge medicines and, for each one, the sentence in the
letter it came from. Then it shows you the comparison.

If the letter can't be read, add the discharge medicines by hand under **Medicines on discharge**.

## 7. Stage 1: review the discharge information
The comparison shows each medicine before admission beside the same medicine on discharge, with what changed in
the middle:

| Mark | Meaning |
|---|---|
| **+ Started** | New on discharge |
| **× Stopped** | Was taken before admission, not on the discharge list (the name is crossed out) |
| **Δ Changed** | Same medicine, different strength, dose or how often (the difference is spelled out) |
| **= Unchanged** | The same before and after |
| **? Needs review** | The app isn't sure, and says why (for example "Zestril is a brand of lisinopril" or "dose written differently") |
| **High-risk medicine** | A red band with the group, e.g. anticoagulant, insulin, opioid |

Each mark is a word **and** a shape, not just a colour.

- **See the letter sentence and details** shows the exact sentence in the letter, highlighted.
- **Needs review lines:** read the reason, then select the empty **Checked by** box and choose **Add my initials**.
  You can add a short note. **Undo** removes your initials. If you edit a medicine afterwards, its line must be
  checked again.
- **Stage notes** save automatically ("Saved automatically"); if saving fails, you'll see **Retry**.
- When every flagged line has your initials, choose **Complete stage 1**. Until then the button stays locked and
  the bar says how many lines still need checking.

The 72-hour indicator at the top shows how long is left for stage 1. It is a guide, not a hard deadline.

## 8. Stages 2 and 3
Choose a stage in the stage strip at the top of the case.

- **Stage 2: check the first new prescription.** When the first prescription after discharge arrives, add its
  medicines under **First new prescription (stage 2)** on the edit page. The same comparison then checks it against
  the discharge list and flags every difference for you to check.
- **Stage 3: consultation with the patient or carer.** Record the consultation in the stage notes, then complete
  the stage.
- **Mark as not applicable…** if a stage can't happen (for example readmitted, declined, or no new prescription
  received). A reason is required.
- **Reopen stage** if you need to change a completed stage (not possible once the case is claimed).

## 9. Copy a demo case to practise
On a demo case, choose **Copy to my cases**. You get the letter and the before-admission list in your own cases,
so you can read the letter, check the flagged lines and complete the stages yourself.

## 10. Claims and stats
Choose **Claims** in the menu.

- **Claim work** lists your cases with their stages, value and **Claim by** date.
- **See the claim summary** shows each field MYS asks for, in order, with a **Copy** button next to each one.
- After you've submitted the claim in MYS, choose **Mark as claimed**. A claimed case's stages can't be changed.
- **What the comparisons found** counts started, stopped, changed and unchanged lines and the high-risk groups
  across your cases.

Fees shown (£12, £11, £12 per stage) and the claim-by rule come from Community Pharmacy England (checked November
2026). Check them against the current Drug Tariff. The app does not submit claims to MYS for you.

## 11. Good to know
- **Your cases are private:** nobody else can see or change them.
- **What the app never does:** decide whether a change is right, suggest a dose or an alternative, or complete a
  stage for you.
- **If something goes wrong,** the app tells you what happened and what to try next. If it keeps happening, note
  the case reference and the time, and tell the developer.
- **Log out** from the menu when you finish, especially on a shared computer.
