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

// ---- Further demo cases (owner's scenarios, clinically checked by the owner, 17 Nov; D-047) ----------------------

// A letter in the same shape as DMS-0042, so each one reads like a real discharge summary.
function letter(reference: string, nhsNumber: string, ward: string, diagnosis: string, summary: string, lines: string[]): string {
  return `NORTHFIELD GENERAL HOSPITAL (SYNTHETIC)
Discharge summary. Prototype demo letter: not a real patient.

Patient reference: ${reference}
NHS number: ${nhsNumber} (test range)
Ward: ${ward}
Diagnosis: ${diagnosis}

Summary: ${summary}

Medicines on discharge:
${lines.join("\n")}`;
}

const tablet = { form: "tablets", route: "oral" };

export const DMS_0043: DemoCase = {
  reference: "DMS-0043",
  hospitalName: "Northfield General Hospital (synthetic)",
  letterText: letter("DMS-0043", "999 000 0026", "Cardiology", "Atrial fibrillation; anticoagulation reviewed.",
    "Admitted with fast atrial fibrillation, now rate controlled. Anticoagulation reviewed during the admission.", [
      "Warfarin stopped following anticoagulation review.",
      "Apixaban 5 mg twice daily started.",
      "Continue bisoprolol 2.5 mg once daily.",
      "Continue atorvastatin 20 mg at night.",
    ]),
  preAdmission: [
    { name: "Warfarin", strength: "3 mg", dose: null, frequency: "each evening", ...tablet },
    { name: "Bisoprolol", strength: "2.5 mg", dose: "one tablet", frequency: "once daily", ...tablet },
    { name: "Atorvastatin", strength: "20 mg", dose: "one tablet", frequency: "at night", ...tablet },
  ],
  extraction: [
    { name: "Warfarin", status_in_letter: "stopped", source_text: "Warfarin stopped following anticoagulation review.", confidence: 0.97 },
    { name: "Apixaban", strength: "5 mg", frequency: "twice daily", status_in_letter: "new", source_text: "Apixaban 5 mg twice daily started.", confidence: 0.97 },
    { name: "Bisoprolol", strength: "2.5 mg", frequency: "once daily", status_in_letter: "continued", source_text: "Continue bisoprolol 2.5 mg once daily.", confidence: 0.96 },
    { name: "Atorvastatin", strength: "20 mg", frequency: "at night", status_in_letter: "continued", source_text: "Continue atorvastatin 20 mg at night.", confidence: 0.97 },
  ],
};

export const DMS_0044: DemoCase = {
  reference: "DMS-0044",
  hospitalName: "Northfield General Hospital (synthetic)",
  letterText: letter("DMS-0044", "999 000 0034", "Diabetes and endocrinology", "Hypoglycaemia.",
    "Admitted after a hypoglycaemic episode at night. Basal insulin dose reduced; diabetes team to follow up.", [
      "Insulin glargine reduced to 16 units at night following hypoglycaemia.",
      "Continue metformin 500 mg twice daily.",
      "Continue ramipril 5 mg once daily.",
    ]),
  preAdmission: [
    { name: "Insulin glargine", strength: null, form: "injection", dose: "20 units", frequency: "at night", route: "subcutaneous" },
    { name: "Metformin", strength: "500 mg", dose: "one tablet", frequency: "twice daily", ...tablet },
    { name: "Ramipril", strength: "5 mg", dose: "one capsule", frequency: "once daily", form: "capsules", route: "oral" },
  ],
  extraction: [
    { name: "Insulin glargine", dose: "16 units", frequency: "at night", status_in_letter: "changed", source_text: "Insulin glargine reduced to 16 units at night following hypoglycaemia.", confidence: 0.96 },
    { name: "Metformin", strength: "500 mg", frequency: "twice daily", status_in_letter: "continued", source_text: "Continue metformin 500 mg twice daily.", confidence: 0.97 },
    { name: "Ramipril", strength: "5 mg", frequency: "once daily", status_in_letter: "continued", source_text: "Continue ramipril 5 mg once daily.", confidence: 0.97 },
  ],
};

export const DMS_0045: DemoCase = {
  reference: "DMS-0045",
  hospitalName: "Northfield General Hospital (synthetic)",
  letterText: letter("DMS-0045", "999 000 0042", "Acute medical unit", "Cellulitis of the left leg, treated.",
    "Admitted with cellulitis, treated with intravenous antibiotics in hospital. Course completed before discharge.", [
      "Continue amlodipine 5 mg once daily.",
      "Continue omeprazole 20 mg once daily.",
    ]),
  preAdmission: [
    { name: "Levothyroxine", strength: "100 micrograms", dose: "one tablet", frequency: "each morning", ...tablet },
    { name: "Amlodipine", strength: "5 mg", dose: "one tablet", frequency: "once daily", ...tablet },
    { name: "Omeprazole", strength: "20 mg", dose: "one capsule", frequency: "once daily", form: "gastro-resistant capsules", route: "oral" },
  ],
  extraction: [
    { name: "Amlodipine", strength: "5 mg", frequency: "once daily", status_in_letter: "continued", source_text: "Continue amlodipine 5 mg once daily.", confidence: 0.97 },
    { name: "Omeprazole", strength: "20 mg", frequency: "once daily", status_in_letter: "continued", source_text: "Continue omeprazole 20 mg once daily.", confidence: 0.97 },
  ],
};

export const DMS_0046: DemoCase = {
  reference: "DMS-0046",
  hospitalName: "Northfield General Hospital (synthetic)",
  letterText: letter("DMS-0046", "999 000 0050", "Cardiology", "Heart failure with fluid overload.",
    "Admitted with breathlessness and ankle swelling. Diuretics increased; heart failure nurse to follow up.", [
      "Furosemide increased to 40 mg twice daily.",
      "Spironolactone 25 mg once daily started.",
      "Continue bisoprolol 5 mg once daily.",
      "Continue ramipril 2.5 mg once daily.",
    ]),
  preAdmission: [
    { name: "Furosemide", strength: "40 mg", dose: "one tablet", frequency: "OD", ...tablet },
    { name: "Bisoprolol", strength: "5 mg", dose: "one tablet", frequency: "once daily", ...tablet },
    { name: "Ramipril", strength: "2.5 mg", dose: "one capsule", frequency: "once daily", form: "capsules", route: "oral" },
  ],
  extraction: [
    { name: "Furosemide", strength: "40 mg", frequency: "twice daily", status_in_letter: "changed", source_text: "Furosemide increased to 40 mg twice daily.", confidence: 0.96 },
    { name: "Spironolactone", strength: "25 mg", frequency: "once daily", status_in_letter: "new", source_text: "Spironolactone 25 mg once daily started.", confidence: 0.97 },
    { name: "Bisoprolol", strength: "5 mg", frequency: "once daily", status_in_letter: "continued", source_text: "Continue bisoprolol 5 mg once daily.", confidence: 0.97 },
    { name: "Ramipril", strength: "2.5 mg", frequency: "once daily", status_in_letter: "continued", source_text: "Continue ramipril 2.5 mg once daily.", confidence: 0.97 },
  ],
};

export const DMS_0047: DemoCase = {
  reference: "DMS-0047",
  hospitalName: "Northfield General Hospital (synthetic)",
  letterText: letter("DMS-0047", "999 000 0069", "Orthopaedics", "Elective right knee replacement.",
    "Routine recovery after surgery. Short course of pain relief for home; physiotherapy follow-up arranged.", [
      "Morphine sulfate MR 10 mg twice daily for 5 days, then stop.",
      "Senna 7.5 mg two tablets at night while taking morphine, started.",
      "Ibuprofen stopped.",
      "Continue atorvastatin 40 mg at night.",
    ]),
  preAdmission: [
    { name: "Ibuprofen", strength: "400 mg", dose: "one tablet", frequency: "three times a day", ...tablet },
    { name: "Atorvastatin", strength: "40 mg", dose: "one tablet", frequency: "at night", ...tablet },
  ],
  extraction: [
    { name: "Morphine sulfate", strength: "10 mg", form: "modified-release tablets", frequency: "twice daily for 5 days, then stop", status_in_letter: "new", source_text: "Morphine sulfate MR 10 mg twice daily for 5 days, then stop.", confidence: 0.95 },
    { name: "Senna", strength: "7.5 mg", dose: "two tablets", frequency: "at night while taking morphine", status_in_letter: "new", source_text: "Senna 7.5 mg two tablets at night while taking morphine, started.", confidence: 0.94 },
    { name: "Ibuprofen", status_in_letter: "stopped", source_text: "Ibuprofen stopped.", confidence: 0.97 },
    { name: "Atorvastatin", strength: "40 mg", frequency: "at night", status_in_letter: "continued", source_text: "Continue atorvastatin 40 mg at night.", confidence: 0.97 },
  ],
};

export const DEMO_CASES: DemoCase[] = [DMS_0042, DMS_0043, DMS_0044, DMS_0045, DMS_0046, DMS_0047];
