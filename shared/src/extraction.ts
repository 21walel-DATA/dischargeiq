import { z } from "zod";
import { letterStatusSchema } from "./reconciliation";

// The ONLY shape we accept from the AI (golden rule 5). Anything else is rejected before it touches the database.
// Field names use snake_case because that's what the AI is asked to return (architecture.md section 6).
const optionalText = z.string().trim().max(200).nullish(); // nullish = may be missing or null

export const extractedMedicineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  strength: optionalText,
  form: optionalText,
  dose: optionalText,
  frequency: optionalText,
  route: optionalText,
  status_in_letter: letterStatusSchema.nullish(),
  source_text: z.string().trim().min(1).max(1000),
  confidence: z.number().min(0).max(1),
});
export type ExtractedMedicine = z.infer<typeof extractedMedicineSchema>;

export const extractionSchema = z.object({
  medicines: z.array(extractedMedicineSchema).max(100),
});
export type Extraction = z.infer<typeof extractionSchema>;

// "mock" = the built-in sample extraction (no API key, and always in tests); "live" = Claude.
export const aiModeSchema = z.enum(["mock", "live"]);
export type AiMode = z.infer<typeof aiModeSchema>;
