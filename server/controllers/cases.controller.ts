// Handles case, medicine, extraction, comparison and demo requests: check the input with the shared Zod schemas,
// call a service, reply. Ownership was already checked by middleware (loadOwnedCase / loadOwnedMedicine / loadDemoCase).
import type { Request, Response } from "express";
import {
  caseCreateSchema,
  caseUpdateSchema,
  medicineCreateSchema,
  medicineUpdateSchema,
  countUnclear,
  REAL_NHS_NUMBER_MESSAGE,
  type ExtractResponse,
  type ReconciliationResponse,
  type TranscribeResponse,
} from "@dischargeiq/shared";
import { detectLetterFile } from "../services/letterFile.service";
import { getCurrentUser } from "../middleware/requireAuth";
import { getOwnedCaseId } from "../middleware/loadOwnedCase";
import { getOwnedMedicineId } from "../middleware/loadOwnedMedicine";
import { copyDemoCase, createCase, deleteCase, getCaseDetail, listCases, listDemoCases, updateCase } from "../services/case.service";
import { addMedicine, deleteMedicine, replaceDischargeList, updateMedicine } from "../services/medicine.service";
import { aiMode, extractMedicines, transcribeLetter } from "../services/ai.service";
import { compareCase } from "../services/comparison.service";
import { sendValidationError } from "./validation";

const REFERENCE_TAKEN = {
  error: "You already have a case with this reference. Use a different one.",
  fields: { reference: "You already have a case with this reference." },
};
const CASE_NOT_FOUND = { error: "We couldn't find that case." };

// ---- Cases -------------------------------------------------------------------------------------------------------

export async function listMyCases(_req: Request, res: Response): Promise<void> {
  res.json({ cases: await listCases(getCurrentUser(res).id) });
}

export async function createMyCase(req: Request, res: Response): Promise<void> {
  const parsed = caseCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const created = await createCase(getCurrentUser(res).id, parsed.data);
  if (!created.ok) {
    res.status(409).json(REFERENCE_TAKEN);
    return;
  }
  res.status(201).json({ case: await getCaseDetail(created.id) });
}

// Used for both your own cases and demo cases: the middleware decided which case id is allowed.
export async function getCase(_req: Request, res: Response): Promise<void> {
  const detail = await getCaseDetail(getOwnedCaseId(res));
  if (!detail) {
    res.status(404).json(CASE_NOT_FOUND);
    return;
  }
  res.json({ case: detail });
}

export async function updateMyCase(req: Request, res: Response): Promise<void> {
  const parsed = caseUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const caseId = getOwnedCaseId(res);
  const updated = await updateCase(caseId, parsed.data);
  if (!updated.ok) {
    res.status(409).json(REFERENCE_TAKEN);
    return;
  }
  res.json({ case: await getCaseDetail(caseId) });
}

export async function deleteMyCase(_req: Request, res: Response): Promise<void> {
  await deleteCase(getOwnedCaseId(res));
  res.status(204).end();
}

// ---- Medicines ---------------------------------------------------------------------------------------------------

export async function addMyMedicine(req: Request, res: Response): Promise<void> {
  const parsed = medicineCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  res.status(201).json({ medicine: await addMedicine(getOwnedCaseId(res), parsed.data) });
}

export async function updateMyMedicine(req: Request, res: Response): Promise<void> {
  const parsed = medicineUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const medicine = await updateMedicine(getOwnedMedicineId(res), parsed.data);
  if (!medicine) {
    res.status(404).json({ error: "We couldn't find that medicine." });
    return;
  }
  res.json({ medicine });
}

export async function deleteMyMedicine(_req: Request, res: Response): Promise<void> {
  await deleteMedicine(getOwnedMedicineId(res));
  res.status(204).end();
}

// ---- AI extraction and comparison --------------------------------------------------------------------------------

export function getAiStatus(_req: Request, res: Response): void {
  res.json({ mode: aiMode() });
}

export async function extractFromLetter(_req: Request, res: Response): Promise<void> {
  const caseId = getOwnedCaseId(res);
  const detail = await getCaseDetail(caseId);
  if (!detail?.letterText) {
    res.status(400).json({ error: "Paste the discharge letter into the case first, then read it." });
    return;
  }
  // D-054: an uploaded letter may still have parts the AI couldn't read. Checked HERE, so a page bug can't skip it.
  const unclear = countUnclear(detail.letterText);
  if (unclear > 0) {
    res.status(400).json({
      error: `The letter still has ${unclear} [unclear] ${unclear === 1 ? "part" : "parts"}. Check them against the letter, type what it says, then read it.`,
    });
    return;
  }
  const result = await extractMedicines(detail.letterText);
  if (!result.ok) {
    // Friendly message + a way forward (manual entry). Details are in the server log only.
    const message =
      result.reason === "unavailable"
        ? "The letter reader isn't available right now. Try again in a minute, or add the medicines by hand."
        : "We couldn't read this letter automatically. Add the medicines by hand.";
    res.status(503).json({ error: message });
    return;
  }
  const medicines = await replaceDischargeList(caseId, result.medicines);
  const body: ExtractResponse = { mode: result.mode, medicines };
  res.json(body);
}

// POST /cases/:id/transcribe (D-054). The body is the file itself (PDF, PNG or JPEG), held in memory only and never
// stored. Gives back the letter as TEXT for the pharmacist to check; nothing is saved to the case here.
const TRANSCRIBE_FAILED: Record<"unreadable" | "unavailable" | "unknownDemoFile", { status: number; error: string }> = {
  unreadable: { status: 503, error: "We couldn't read this file. Try a clearer photo or the PDF, or paste the letter text." },
  unavailable: { status: 503, error: "The letter reader isn't available right now. Try again in a minute, or paste the letter text." },
  unknownDemoFile: {
    status: 422,
    error: "Demo mode can only read the sample letter files. Download one from the upload box, or paste the letter text.",
  },
};

export async function transcribeUpload(req: Request, res: Response): Promise<void> {
  if (req.query.synthetic !== "confirmed") {
    res.status(400).json({ error: "Tick the box to confirm this is a synthetic letter, not a real patient's." });
    return;
  }
  // express.raw only fills req.body (as bytes) for a PDF, PNG or JPEG upload; anything else leaves no Buffer.
  const bytes: unknown = req.body;
  const kind = Buffer.isBuffer(bytes) ? detectLetterFile(bytes) : null;
  if (!Buffer.isBuffer(bytes) || kind === null) {
    res.status(415).json({ error: "Upload a PDF, PNG or JPEG of the letter." });
    return;
  }
  const result = await transcribeLetter(bytes, kind);
  if (!result.ok) {
    if (result.reason === "realNhsNumber") {
      res.status(422).json({ error: REAL_NHS_NUMBER_MESSAGE });
      return;
    }
    const failure = TRANSCRIBE_FAILED[result.reason];
    res.status(failure.status).json({ error: failure.error });
    return;
  }
  const body: TranscribeResponse = { mode: result.mode, letterText: result.letterText, unclearCount: result.unclearCount };
  res.json(body);
}

export async function getReconciliation(req: Request, res: Response): Promise<void> {
  const stage = req.query.stage === "2" ? 2 : 1;
  const detail = await getCaseDetail(getOwnedCaseId(res));
  if (!detail) {
    res.status(404).json(CASE_NOT_FOUND);
    return;
  }
  const body: ReconciliationResponse = { stage, lines: compareCase(detail, stage) };
  res.json(body);
}

// ---- Demo cases --------------------------------------------------------------------------------------------------

export async function listDemo(_req: Request, res: Response): Promise<void> {
  res.json({ cases: await listDemoCases() });
}

export async function copyDemo(_req: Request, res: Response): Promise<void> {
  const newId = await copyDemoCase(getOwnedCaseId(res), getCurrentUser(res).id);
  if (!newId) {
    res.status(404).json({ error: "We couldn't find that demo case." });
    return;
  }
  res.status(201).json({ case: await getCaseDetail(newId) });
}
