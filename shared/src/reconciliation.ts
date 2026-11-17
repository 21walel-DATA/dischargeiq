import { z } from "zod";

// What the discharge letter itself says about a medicine (architecture.md section 6).
export const letterStatusSchema = z.enum(["new", "stopped", "changed", "continued", "withheld"]);
export type LetterStatus = z.infer<typeof letterStatusSchema>;

// One medicine as the comparison engine sees it. Text fields are exactly as entered or extracted;
// the engine tidies them up itself and never changes what is shown to the pharmacist.
export const comparedMedicineSchema = z.object({
  id: z.string(),
  name: z.string(),
  strength: z.string().nullable(),
  form: z.string().nullable(),
  dose: z.string().nullable(),
  frequency: z.string().nullable(),
  route: z.string().nullable(),
  letterStatus: letterStatusSchema.nullable(),
  sourceText: z.string().nullable(), // the exact sentence from the letter (extracted lines only)
  aiConfidence: z.number().nullable(), // 0 to 1, from the AI; null when typed by a person
  sourceFound: z.boolean(), // false when the quoted sentence isn't actually in the letter (hallucination check)
});
export type ComparedMedicine = z.infer<typeof comparedMedicineSchema>;

export const changeTypeSchema = z.enum(["started", "stopped", "changed", "unchanged"]);
export type ChangeType = z.infer<typeof changeTypeSchema>;

// One line of the comparison. Every line has exactly one of the four categories (D-032);
// "needs review" is a flag with reasons on top of the category, never a fifth category.
export const reconciliationLineSchema = z.object({
  key: z.string(), // "from:<id>|to:<id>": editing a medicine gives a new key, so it must be re-acknowledged
  changeType: changeTypeSchema,
  from: comparedMedicineSchema.nullable(), // before (pre-admission list, or discharge list in stage 2)
  to: comparedMedicineSchema.nullable(), // after (discharge list, or new prescription in stage 2)
  changeDetails: z.array(z.string()), // e.g. "Strength 5 mg → 10 mg"
  timingNote: z.string().nullable(), // e.g. "Timing differs: each morning → once daily" (not a change)
  letterStatus: letterStatusSchema.nullable(), // what the letter said, e.g. "withheld"
  sourceText: z.string().nullable(), // the letter sentence this line comes from
  needsReview: z.boolean(),
  reviewReasons: z.array(z.string()),
  highRisk: z.boolean(),
  highRiskReason: z.string().nullable(),
});
export type ReconciliationLine = z.infer<typeof reconciliationLineSchema>;
