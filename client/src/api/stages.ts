// Fetch wrappers for the DMS stage tracker and claims (D-048). Relative /api URLs; answers checked with Zod.
import {
  claimListSchema,
  claimSummarySchema,
  dmsStageSchema,
  statsSchema,
  type ClaimSummary,
  type DmsStage,
  type StageUpdate,
  type Stats,
} from "@dischargeiq/shared";
import { z } from "zod";
import type { Failure } from "./cases";

const errorBodySchema = z.object({
  error: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
  unresolved: z.number().optional(),
});
const stagesBodySchema = z.object({ stages: z.array(dmsStageSchema) });
const claimBodySchema = z.object({ claim: claimSummarySchema });

async function send(method: string, url: string, body?: unknown): Promise<{ ok: true; body: unknown } | Failure> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, message: "We couldn't reach DischargeIQ. Check your connection and try again.", fields: {} };
  }
  const json: unknown = await response.json().catch(() => null);
  if (response.ok) return { ok: true, body: json };
  const error = errorBodySchema.safeParse(json);
  return error.success
    ? { ok: false, status: response.status, message: error.data.error, fields: error.data.fields ?? {} }
    : { ok: false, status: response.status, message: "Something went wrong on our side. Try again in a moment.", fields: {} };
}

const badAnswer: Failure = { ok: false, status: 0, message: "Something went wrong on our side. Try again in a moment.", fields: {} };

function parseStages(result: { ok: true; body: unknown } | Failure): { ok: true; stages: DmsStage[] } | Failure {
  if (!result.ok) return result;
  const parsed = stagesBodySchema.safeParse(result.body);
  return parsed.success ? { ok: true, stages: parsed.data.stages } : badAnswer;
}

// Autosave, acknowledgements, "not applicable", reopen. Returns the case's three stages as they are now.
export async function updateStage(caseId: string, stage: number, changes: StageUpdate): Promise<{ ok: true; stages: DmsStage[] } | Failure> {
  return parseStages(await send("PATCH", `/api/cases/${encodeURIComponent(caseId)}/stages/${stage}`, changes));
}

export async function completeStage(caseId: string, stage: number): Promise<{ ok: true; stages: DmsStage[] } | Failure> {
  return parseStages(await send("POST", `/api/cases/${encodeURIComponent(caseId)}/stages/${stage}/complete`));
}

export async function getClaimSummary(caseId: string): Promise<{ ok: true; claim: ClaimSummary } | Failure> {
  const result = await send("GET", `/api/cases/${encodeURIComponent(caseId)}/claim-summary`);
  if (!result.ok) return result;
  const parsed = claimBodySchema.safeParse(result.body);
  return parsed.success ? { ok: true, claim: parsed.data.claim } : badAnswer;
}

export async function markClaimed(caseId: string): Promise<{ ok: true; claim: ClaimSummary } | Failure> {
  const result = await send("POST", `/api/cases/${encodeURIComponent(caseId)}/mark-claimed`);
  if (!result.ok) return result;
  const parsed = claimBodySchema.safeParse(result.body);
  return parsed.success ? { ok: true, claim: parsed.data.claim } : badAnswer;
}

export async function listClaims(): Promise<{ ok: true; claims: ClaimSummary[] } | Failure> {
  const result = await send("GET", "/api/claims");
  if (!result.ok) return result;
  const parsed = claimListSchema.safeParse(result.body);
  return parsed.success ? { ok: true, claims: parsed.data.claims } : badAnswer;
}

export async function getStats(): Promise<{ ok: true; stats: Stats } | Failure> {
  const result = await send("GET", "/api/stats");
  if (!result.ok) return result;
  const parsed = statsSchema.safeParse(result.body);
  return parsed.success ? { ok: true, stats: parsed.data } : badAnswer;
}
