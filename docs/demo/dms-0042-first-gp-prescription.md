# DMS-0042: first new prescription after discharge (SYNTHETIC)

> **Synthetic demo data only. Not a real patient, prescriber or practice.** Used for the stage 2 re-check demo.

## As the prescription would read

```
FIRST REPEAT PRESCRIPTION AFTER DISCHARGE (SYNTHETIC: prototype demo, not a real patient)
Practice: Northfield Road Surgery (synthetic)
Patient reference: DMS-0042        NHS number: 999 000 0018 (test range)

Lansoprazole 30 mg capsules       once daily
Amlodipine 5 mg tablets           once daily                       <-- still the OLD dose
Atorvastatin 20 mg tablets        at night
Levothyroxine 100 micrograms      each morning
Zestril 10 mg tablets             one tablet in the morning
Paracetamol 500 mg tablets        two tablets up to four times a day when required
```

What it shows: the hospital **increased amlodipine to 10 mg**, but the GP's first prescription still says **5 mg**.
Warfarin and naproxen are correctly absent. Stage 2 should flag amlodipine and nothing else.

## What to type in the app

Stage 2 has **no paste box**: you add the prescription one medicine at a time, under
**Edit case → "First new prescription (stage 2)"** (fields: Medicine, Strength, Dose, How often → **Add medicine**).
Type these exactly. Leave Dose empty where it says "(empty)".

| Medicine | Strength | Dose | How often |
|---|---|---|---|
| Lansoprazole | 30 mg | (empty) | once daily |
| **Amlodipine** | **5 mg** | (empty) | once daily |
| Atorvastatin | 20 mg | (empty) | at night |
| Levothyroxine | 100 micrograms | (empty) | each morning |
| Zestril | 10 mg | one tablet | in the morning |
| Paracetamol | 500 mg | two tablets | up to four times a day when required |

**Checked on the live site (18 Nov 2026):** 1 changed, 0 stopped, 0 started, **1 needs review**, 5 unchanged.
Amlodipine shows "Strength 10 mg → 5 mg. The new prescription differs from the discharge list: check with the
prescriber." See `stage2-one-flag.png`.

### Why "Zestril" and not "Lisinopril"
Stage 2 flags **every** difference from the discharge list (D-048). The letter says *Zestril*, so a prescription
written as *Lisinopril* raises a second flag ("Possible brand/generic match"). That's correct and safe behaviour,
and a good Q&A answer, but for a 5-minute demo one clean flag is clearer. If you want to show it, type Lisinopril
instead and you'll get 2 lines to check.

### If an extra line is flagged on your own case
The discharge list comes from the live AI reading the letter, so wording can differ slightly between reads
(e.g. "once a day" instead of "once daily"). Before stage 2, open **Edit medicines or letter** and look at
**Medicines on discharge**; type the prescription to match it, changing only amlodipine to 5 mg.
This is why Case B is prepared the night before (see `demo-walkthrough.md`).
