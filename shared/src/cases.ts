import { z } from "zod";
import { containsRealNhsNumber, REAL_NHS_NUMBER_MESSAGE } from "./nhsNumber";
import { letterStatusSchema, reconciliationLineSchema } from "./reconciliation";
import { aiModeSchema } from "./extraction";
import { acknowledgementSchema } from "./stages";

// ---- Field rules shared by the forms and the server -----------------------------------------------------------

// Every free-text field goes through the NHS number guard (D-030).
const noRealNhsNumber = { check: (value: string): boolean => !containsRealNhsNumber(value), error: REAL_NHS_NUMBER_MESSAGE };

// Optional text fields: an empty box becomes null, so "nothing entered" is stored one way only.
const optionalShortText = z
  .string()
  .trim()
  .max(120, { error: "Use 120 characters or fewer." })
  .refine(noRealNhsNumber.check, { error: noRealNhsNumber.error })
  .transform((value) => (value === "" ? null : value))
  .nullish();

const optionalLetterText = z
  .string()
  .trim()
  .max(20000, { error: "The letter is too long (20,000 characters at most)." })
  .refine(noRealNhsNumber.check, { error: noRealNhsNumber.error })
  .transform((value) => (value === "" ? null : value))
  .nullish();

export const listTypeSchema = z.enum(["pre_admission", "discharge", "new_prescription"]);
export type ListType = z.infer<typeof listTypeSchema>;

// ---- Requests ----------------------------------------------------------------------------------------------------

export const caseCreateSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, { error: "Enter a case reference, e.g. DMS-0101." })
    .max(40, { error: "Use 40 characters or fewer." })
    .refine((value) => !/\d{10}/.test(value.replace(/[\s-]/g, "")), {
    error: "Don't use an NHS number as the reference. Use your own code, e.g. DMS-0101.",
  }),
  hospitalName: optionalShortText,
  referralReceivedAt: z.iso.datetime({ offset: true, error: "Enter a valid date and time." }).nullish(),
  letterText: optionalLetterText,
});
export type CaseCreate = z.infer<typeof caseCreateSchema>;

// PATCH: any of the same fields, all optional (used by the edit form and, later, autosave).
export const caseUpdateSchema = caseCreateSchema.partial();
export type CaseUpdate = z.infer<typeof caseUpdateSchema>;

export const medicineCreateSchema = z.object({
  listType: listTypeSchema,
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter the medicine name." })
    .max(200, { error: "Use 200 characters or fewer." })
    .refine(noRealNhsNumber.check, { error: noRealNhsNumber.error }),
  strength: optionalShortText,
  form: optionalShortText,
  dose: optionalShortText,
  frequency: optionalShortText,
  route: optionalShortText,
});
export type MedicineCreate = z.infer<typeof medicineCreateSchema>;

// Editing can't move a medicine to another list (delete and re-add instead).
export const medicineUpdateSchema = medicineCreateSchema.omit({ listType: true }).partial();
export type MedicineUpdate = z.infer<typeof medicineUpdateSchema>;

// ---- Responses ---------------------------------------------------------------------------------------------------

export const medicineSchema = z.object({
  id: z.uuid(),
  caseId: z.uuid(),
  listType: listTypeSchema,
  name: z.string(),
  strength: z.string().nullable(),
  form: z.string().nullable(),
  dose: z.string().nullable(),
  frequency: z.string().nullable(),
  route: z.string().nullable(),
  sourceText: z.string().nullable(),
  letterStatus: letterStatusSchema.nullable(),
  aiConfidence: z.number().nullable(),
  editedByUser: z.boolean(),
});
export type Medicine = z.infer<typeof medicineSchema>;

export const stageStatusSchema = z.enum(["pending", "completed", "not_applicable"]);

export const dmsStageSchema = z.object({
  stage: z.number(),
  status: stageStatusSchema,
  notApplicableReason: z.string().nullable(),
  completedAt: z.string().nullable(),
  notes: z.string().nullable(),
  completedByInitials: z.string().nullable(),
  acknowledgements: z.array(acknowledgementSchema), // "Checked by" for this stage's review lines (D-048)
});
export type DmsStage = z.infer<typeof dmsStageSchema>;

export const caseSummarySchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  hospitalName: z.string().nullable(),
  referralReceivedAt: z.string().nullable(),
  status: z.enum(["draft", "in_progress", "complete"]),
  claimStatus: z.enum(["not_ready", "ready", "claimed"]),
  isDemo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stages: z.array(dmsStageSchema.pick({ stage: true, status: true })),
});
export type CaseSummary = z.infer<typeof caseSummarySchema>;

export const caseDetailSchema = caseSummarySchema.extend({
  letterText: z.string().nullable(),
  medicines: z.array(medicineSchema),
  stages: z.array(dmsStageSchema),
});
export type CaseDetail = z.infer<typeof caseDetailSchema>;

export const caseListResponseSchema = z.object({ cases: z.array(caseSummarySchema) });
export const caseResponseSchema = z.object({ case: caseDetailSchema });
export const medicineResponseSchema = z.object({ medicine: medicineSchema });

export const reconciliationResponseSchema = z.object({
  stage: z.union([z.literal(1), z.literal(2)]),
  lines: z.array(reconciliationLineSchema),
});
export type ReconciliationResponse = z.infer<typeof reconciliationResponseSchema>;

export const extractResponseSchema = z.object({
  mode: aiModeSchema,
  medicines: z.array(medicineSchema), // the new discharge list
});
export type ExtractResponse = z.infer<typeof extractResponseSchema>;

export const aiStatusSchema = z.object({ mode: aiModeSchema });
