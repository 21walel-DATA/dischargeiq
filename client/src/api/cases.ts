// Fetch wrappers for cases, medicines, the letter reader, the comparison and demo cases.
// Relative /api URLs only (golden rule 15). Every answer is checked with the shared Zod schema before use.
import {
  aiStatusSchema,
  caseListResponseSchema,
  caseResponseSchema,
  extractResponseSchema,
  medicineResponseSchema,
  reconciliationResponseSchema,
  transcribeResponseSchema,
  type TranscribeResponse,
  type AiMode,
  type CaseCreate,
  type CaseDetail,
  type CaseSummary,
  type CaseUpdate,
  type ExtractResponse,
  type Medicine,
  type MedicineCreate,
  type MedicineUpdate,
  type ReconciliationResponse,
} from "@dischargeiq/shared";
import { z } from "zod";

// What every call gives back: the data, or a message (and per-field messages) the page can show as it is.
export type Failure = { ok: false; status: number; message: string; fields: Record<string, string> };

const errorBodySchema = z.object({ error: z.string(), fields: z.record(z.string(), z.string()).optional() });
const CANT_CONNECT = "We couldn't reach DischargeIQ. Check your connection and try again.";
const UNEXPECTED = "Something went wrong on our side. Try again in a moment.";

// Sends one request. On success returns the body as `unknown`; each wrapper below checks it with its own schema.
async function send(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ ok: true; status: number; body: unknown } | Failure> {
  let response: Response;
  try {
    // A file (Blob) is sent as it is, labelled with its own type; anything else is sent as JSON.
    const isFile = body instanceof Blob;
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": isFile ? body.type : "application/json" },
      body: body === undefined ? undefined : isFile ? body : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, message: CANT_CONNECT, fields: {} };
  }
  const json: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) {
    return { ok: true, status: response.status, body: json };
  }
  const error = errorBodySchema.safeParse(json);
  return error.success
    ? { ok: false, status: response.status, message: error.data.error, fields: error.data.fields ?? {} }
    : { ok: false, status: response.status, message: UNEXPECTED, fields: {} };
}

const badAnswer: Failure = { ok: false, status: 0, message: UNEXPECTED, fields: {} };

// ---- Cases ------------------------------------------------------------------------------------------------------

export async function listMyCases(): Promise<{ ok: true; cases: CaseSummary[] } | Failure> {
  const result = await send("GET", "/api/cases");
  if (!result.ok) return result;
  const parsed = caseListResponseSchema.safeParse(result.body);
  return parsed.success ? { ok: true, cases: parsed.data.cases } : badAnswer;
}

// `demo` = read the public demo case instead of one of your own.
export async function getCase(id: string, demo: boolean): Promise<{ ok: true; case: CaseDetail } | Failure> {
  const result = await send("GET", `${demo ? "/api/demo-cases" : "/api/cases"}/${encodeURIComponent(id)}`);
  return parseCase(result);
}

export async function createCase(details: CaseCreate): Promise<{ ok: true; case: CaseDetail } | Failure> {
  return parseCase(await send("POST", "/api/cases", details));
}

export async function updateCase(id: string, changes: CaseUpdate): Promise<{ ok: true; case: CaseDetail } | Failure> {
  return parseCase(await send("PATCH", `/api/cases/${encodeURIComponent(id)}`, changes));
}

export async function deleteCase(id: string): Promise<{ ok: true } | Failure> {
  const result = await send("DELETE", `/api/cases/${encodeURIComponent(id)}`);
  return result.ok ? { ok: true } : result;
}

function parseCase(result: { ok: true; status: number; body: unknown } | Failure): { ok: true; case: CaseDetail } | Failure {
  if (!result.ok) return result;
  const parsed = caseResponseSchema.safeParse(result.body);
  return parsed.success ? { ok: true, case: parsed.data.case } : badAnswer;
}

// ---- Medicines ---------------------------------------------------------------------------------------------------

export async function addMedicine(caseId: string, details: MedicineCreate): Promise<{ ok: true; medicine: Medicine } | Failure> {
  return parseMedicine(await send("POST", `/api/cases/${encodeURIComponent(caseId)}/medicines`, details));
}

export async function updateMedicine(id: string, changes: MedicineUpdate): Promise<{ ok: true; medicine: Medicine } | Failure> {
  return parseMedicine(await send("PATCH", `/api/medicines/${encodeURIComponent(id)}`, changes));
}

export async function deleteMedicine(id: string): Promise<{ ok: true } | Failure> {
  const result = await send("DELETE", `/api/medicines/${encodeURIComponent(id)}`);
  return result.ok ? { ok: true } : result;
}

function parseMedicine(result: { ok: true; status: number; body: unknown } | Failure): { ok: true; medicine: Medicine } | Failure {
  if (!result.ok) return result;
  const parsed = medicineResponseSchema.safeParse(result.body);
  return parsed.success ? { ok: true, medicine: parsed.data.medicine } : badAnswer;
}

// ---- Letter reader and comparison ---------------------------------------------------------------------------------

export async function extractFromLetter(caseId: string): Promise<({ ok: true } & ExtractResponse) | Failure> {
  const result = await send("POST", `/api/cases/${encodeURIComponent(caseId)}/extract`);
  if (!result.ok) return result;
  const parsed = extractResponseSchema.safeParse(result.body);
  return parsed.success ? { ok: true, ...parsed.data } : badAnswer;
}

// Letter upload (D-054): sends the PDF or photo; gets back the letter as text to check. Nothing is saved yet.
// `synthetic=confirmed` records that the user ticked "this is a synthetic letter" (the server refuses without it).
export async function transcribeLetter(caseId: string, file: Blob): Promise<({ ok: true } & TranscribeResponse) | Failure> {
  const result = await send("POST", `/api/cases/${encodeURIComponent(caseId)}/transcribe?synthetic=confirmed`, file);
  if (!result.ok) return result;
  const parsed = transcribeResponseSchema.safeParse(result.body);
  return parsed.success ? { ok: true, ...parsed.data } : badAnswer;
}

export async function getReconciliation(
  caseId: string,
  stage: 1 | 2,
  demo: boolean,
): Promise<({ ok: true } & ReconciliationResponse) | Failure> {
  const base = demo ? "/api/demo-cases" : "/api/cases";
  const result = await send("GET", `${base}/${encodeURIComponent(caseId)}/reconciliation?stage=${stage}`);
  if (!result.ok) return result;
  const parsed = reconciliationResponseSchema.safeParse(result.body);
  return parsed.success ? { ok: true, ...parsed.data } : badAnswer;
}

export async function getAiMode(): Promise<AiMode | null> {
  const result = await send("GET", "/api/ai/status");
  if (!result.ok) return null;
  const parsed = aiStatusSchema.safeParse(result.body);
  return parsed.success ? parsed.data.mode : null;
}

// ---- Demo cases --------------------------------------------------------------------------------------------------

export async function listDemoCases(): Promise<{ ok: true; cases: CaseSummary[] } | Failure> {
  const result = await send("GET", "/api/demo-cases");
  if (!result.ok) return result;
  const parsed = caseListResponseSchema.safeParse(result.body);
  return parsed.success ? { ok: true, cases: parsed.data.cases } : badAnswer;
}

export async function copyDemoCase(id: string): Promise<{ ok: true; case: CaseDetail } | Failure> {
  return parseCase(await send("POST", `/api/demo-cases/${encodeURIComponent(id)}/copy`));
}
