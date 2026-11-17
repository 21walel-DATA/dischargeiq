import { z } from "zod";
import { containsRealNhsNumber, REAL_NHS_NUMBER_MESSAGE } from "./nhsNumber";

const noRealNhsNumber = (value: string): boolean => !containsRealNhsNumber(value);

// ---- Acknowledging "Needs review" lines (D-032, D-036, D-048) ---------------------------------------------------

export const acknowledgementSchema = z.object({
  key: z.string(), // the comparison line's key
  byInitials: z.string(), // shown in the "Checked by" box, e.g. "DP"
  byName: z.string(),
  at: z.string(), // ISO date-time
  note: z.string().nullable(),
});
export type Acknowledgement = z.infer<typeof acknowledgementSchema>;

// "Dina Patel" → "DP"; "Dina" → "DI". Shown in the "Checked by" box, like initialling a label.
export function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ---- PATCH /cases/:id/stages/:stage (autosave) -------------------------------------------------------------------
// Every field is optional; the page sends only what changed. Last write wins (D-021).

const shortNote = z
  .string()
  .trim()
  .max(300, { error: "Use 300 characters or fewer." })
  .refine(noRealNhsNumber, { error: REAL_NHS_NUMBER_MESSAGE });

export const stageUpdateSchema = z
  .object({
    notes: z
      .string()
      .max(4000, { error: "Notes are too long (4,000 characters at most)." })
      .refine(noRealNhsNumber, { error: REAL_NHS_NUMBER_MESSAGE })
      .nullish(),
    status: z.enum(["pending", "not_applicable"]).optional(), // "completed" only via the complete route
    notApplicableReason: shortNote.optional(),
    acknowledge: z.object({ key: z.string().min(1).max(200), note: shortNote.optional() }).optional(),
    unacknowledge: z.string().min(1).max(200).optional(),
  })
  .refine((body) => body.status !== "not_applicable" || (body.notApplicableReason ?? "") !== "", {
    path: ["notApplicableReason"],
    error: "Give a reason, e.g. readmitted, declined, or no new prescription received.",
  });
export type StageUpdate = z.infer<typeof stageUpdateSchema>;

// ---- Claims (D-021, D-023, D-048) ----------------------------------------------------------------------------------

// DMS fee per completed stage, in pounds. Source: Community Pharmacy England (checked Nov 2026).
// Check against the current Drug Tariff before relying on it. A case's value is the sum of its completed stages.
export const STAGE_FEES: Record<number, number> = { 1: 12, 2: 11, 3: 12 };

// The latest date to claim, from the month the final stage was completed. Owner's rule (D-048): the normal deadline
// is the 5th of the following month, and late claims are accepted for three more months, so the final deadline is
// the 5th of the FOURTH calendar month after completion. Example: completed in July → claim by 5 November.
// Source: Community Pharmacy England (claim period extended to three months from July 2024).
// Returns a plain date "YYYY-MM-DD" (UTC month).
export function claimByDate(lastStageCompletedAt: string): string {
  const completed = new Date(lastStageCompletedAt);
  return new Date(Date.UTC(completed.getUTCFullYear(), completed.getUTCMonth() + 4, 5)).toISOString().slice(0, 10);
}

// For the earliest payment: the 5th of the month after completion.
export function earliestPaymentDate(lastStageCompletedAt: string): string {
  const completed = new Date(lastStageCompletedAt);
  return new Date(Date.UTC(completed.getUTCFullYear(), completed.getUTCMonth() + 1, 5)).toISOString().slice(0, 10);
}

export const claimSummarySchema = z.object({
  caseId: z.uuid(),
  reference: z.string(),
  referralReceivedAt: z.string().nullable(),
  hospitalName: z.string().nullable(),
  stages: z.array(
    z.object({
      stage: z.number(),
      status: z.enum(["pending", "completed", "not_applicable"]),
      completedAt: z.string().nullable(),
      notApplicableReason: z.string().nullable(),
    }),
  ),
  value: z.number(), // pounds: completed stages only
  claimStatus: z.enum(["not_ready", "ready", "claimed"]),
  claimedAt: z.string().nullable(),
  lastStageCompletedAt: z.string().nullable(),
  claimBy: z.string().nullable(), // "YYYY-MM-DD", once every stage is done
  earliestPaymentBy: z.string().nullable(),
});
export type ClaimSummary = z.infer<typeof claimSummarySchema>;

export const claimListSchema = z.object({ claims: z.array(claimSummarySchema) });

export const statsSchema = z.object({
  caseCount: z.number(),
  lines: z.object({
    unchanged: z.number(),
    changed: z.number(),
    started: z.number(),
    stopped: z.number(),
    neededReview: z.number(),
  }),
  highRisk: z.array(z.object({ category: z.string(), count: z.number() })),
  money: z.object({
    readyValue: z.number(),
    readyCount: z.number(),
    openCompletedValue: z.number(), // completed stages in cases not yet ready to claim
    openCount: z.number(),
    claimedThisMonthValue: z.number(),
    claimedThisMonthCount: z.number(),
  }),
});
export type Stats = z.infer<typeof statsSchema>;
