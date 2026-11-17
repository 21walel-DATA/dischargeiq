// SYNTHETIC demo data only (golden rule 1). No real patient, hospital letter or NHS number.
// The one NHS number below is from the 999 test range. Source of truth: architecture.md section 12 (D-037).
// Used by: the seed script, the mock AI provider and the reconciliation engine tests, so all three agree.
import type { ExtractedMedicine } from "@dischargeiq/shared";

// A pre-admission medicine as typed from the PMR (patient medication record).
export type DemoMedicine = {
  name: string;
  strength: string | null;
  form: string | null;
  dose: string | null;
  frequency: string | null;
  route: string | null;
};

export type DemoCase = {
  reference: string;
  hospitalName: string;
  letterText: string;
  preAdmission: DemoMedicine[];
  extraction: ExtractedMedicine[]; // what the mock AI returns for this letter
};

const DMS_0042_LETTER = `NORTHFIELD GENERAL HOSPITAL (SYNTHETIC)
Discharge summary. Prototype demo letter: not a real patient.

Patient reference: DMS-0042
NHS number: 999 000 0018 (test range)
Ward: Gastroenterology
Diagnosis: Upper gastrointestinal bleed (duodenal ulcer).

Summary: Admitted with melaena and a drop in haemoglobin. Endoscopy showed a duodenal ulcer, treated during
the procedure. Recovered well and is going home today.

Medication changes:
Warfarin withheld following upper GI bleed; anticoagulant clinic to review.
Naproxen stopped following upper GI bleed.
Lansoprazole 30 mg once daily started.
Amlodipine increased to 10 mg once daily.

Medicines on discharge:
Zestril 10 mg one tablet in the morning.
Paracetamol 500 mg two tablets up to four times a day when required.
Continue atorvastatin 20 mg at night.
Continue levothyroxine 100 micrograms each morning.

Follow-up: GP to check full blood count in two weeks.`;

export const DMS_0042: DemoCase = {
  reference: "DMS-0042",
  hospitalName: "Northfield General Hospital (synthetic)",
  letterText: DMS_0042_LETTER,
  preAdmission: [
    { name: "Warfarin", strength: "3 mg", form: "tablets", dose: null, frequency: "each evening", route: "oral" },
    { name: "Naproxen", strength: "500 mg", form: "tablets", dose: "one tablet", frequency: "twice daily", route: "oral" },
    { name: "Amlodipine", strength: "5 mg", form: "tablets", dose: "one tablet", frequency: "each morning", route: "oral" },
    { name: "Lisinopril", strength: "10 mg", form: "tablets", dose: "one tablet", frequency: "each morning", route: "oral" },
    { name: "Paracetamol", strength: "1 g", form: "tablets", dose: null, frequency: "four times a day when required", route: "oral" },
    { name: "Atorvastatin", strength: "20 mg", form: "tablets", dose: "one tablet", frequency: "at night", route: "oral" },
    { name: "Levothyroxine", strength: "100 micrograms", form: "tablets", dose: "one tablet", frequency: "each morning", route: "oral" },
  ],
  extraction: [
    {
      name: "Warfarin",
      status_in_letter: "withheld",
      source_text: "Warfarin withheld following upper GI bleed; anticoagulant clinic to review.",
      confidence: 0.97,
    },
    {
      name: "Naproxen",
      status_in_letter: "stopped",
      source_text: "Naproxen stopped following upper GI bleed.",
      confidence: 0.98,
    },
    {
      name: "Lansoprazole",
      strength: "30 mg",
      frequency: "once daily",
      status_in_letter: "new",
      source_text: "Lansoprazole 30 mg once daily started.",
      confidence: 0.96,
    },
    {
      name: "Amlodipine",
      strength: "10 mg",
      frequency: "once daily",
      status_in_letter: "changed",
      source_text: "Amlodipine increased to 10 mg once daily.",
      confidence: 0.95,
    },
    {
      name: "Zestril",
      strength: "10 mg",
      dose: "one tablet",
      frequency: "in the morning",
      status_in_letter: "continued",
      source_text: "Zestril 10 mg one tablet in the morning.",
      confidence: 0.93,
    },
    {
      name: "Paracetamol",
      strength: "500 mg",
      dose: "two tablets",
      frequency: "up to four times a day when required",
      status_in_letter: "continued",
      source_text: "Paracetamol 500 mg two tablets up to four times a day when required.",
      confidence: 0.94,
    },
    {
      name: "Atorvastatin",
      strength: "20 mg",
      frequency: "at night",
      status_in_letter: "continued",
      source_text: "Continue atorvastatin 20 mg at night.",
      confidence: 0.97,
    },
    {
      name: "Levothyroxine",
      strength: "100 micrograms",
      frequency: "each morning",
      status_in_letter: "continued",
      source_text: "Continue levothyroxine 100 micrograms each morning.",
      confidence: 0.97,
    },
  ],
};

export const DEMO_CASES: DemoCase[] = [DMS_0042];
