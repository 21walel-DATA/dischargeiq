// Stage tracker and claims requests. Ownership was checked by loadOwnedCase before these run.
import type { Request, Response } from "express";
import { stageUpdateSchema } from "@dischargeiq/shared";
import { getCurrentUser } from "../middleware/requireAuth";
import { getOwnedCaseId } from "../middleware/loadOwnedCase";
import { getStages } from "../services/case.service";
import { completeStage, updateStage, type StageResult } from "../services/stage.service";
import { getClaimSummary, getStats, listClaims, markClaimed } from "../services/claim.service";
import { sendValidationError } from "./validation";

// "/stages/1", "/stages/2" or "/stages/3"; anything else isn't a stage.
function stageNumber(req: Request): number | null {
  const stage = Number(req.params.stage);
  return stage === 1 || stage === 2 || stage === 3 ? stage : null;
}

async function reply(res: Response, caseId: string, result: StageResult): Promise<void> {
  if (!result.ok) {
    res.status(result.status).json({ error: result.message, unresolved: result.unresolved });
    return;
  }
  res.json({ stages: await getStages(caseId) });
}

export async function patchStage(req: Request, res: Response): Promise<void> {
  const stage = stageNumber(req);
  if (stage === null) {
    res.status(404).json({ error: "There are only three DMS stages." });
    return;
  }
  const parsed = stageUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const caseId = getOwnedCaseId(res);
  await reply(res, caseId, await updateStage(caseId, stage, getCurrentUser(res).id, parsed.data));
}

export async function postCompleteStage(req: Request, res: Response): Promise<void> {
  const stage = stageNumber(req);
  if (stage === null) {
    res.status(404).json({ error: "There are only three DMS stages." });
    return;
  }
  const caseId = getOwnedCaseId(res);
  await reply(res, caseId, await completeStage(caseId, stage, getCurrentUser(res).id));
}

export async function getMyClaimSummary(_req: Request, res: Response): Promise<void> {
  res.json({ claim: await getClaimSummary(getOwnedCaseId(res)) });
}

export async function postMarkClaimed(_req: Request, res: Response): Promise<void> {
  const caseId = getOwnedCaseId(res);
  if (!(await markClaimed(caseId))) {
    res.status(409).json({ error: "This case isn't ready to claim yet. Complete or close every stage first." });
    return;
  }
  res.json({ claim: await getClaimSummary(caseId) });
}

export async function getMyClaims(_req: Request, res: Response): Promise<void> {
  res.json({ claims: await listClaims(getCurrentUser(res).id) });
}

export async function getMyStats(_req: Request, res: Response): Promise<void> {
  res.json(await getStats(getCurrentUser(res).id));
}
