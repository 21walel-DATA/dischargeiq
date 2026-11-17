// API documentation (Swagger / OpenAPI 3), served at /api/docs (D-050).
// The endpoint list is written here by hand; the data shapes are GENERATED from the same shared Zod schemas the API
// uses to check every request, so the docs can't drift from what the server actually accepts.
import { z } from "zod";
import {
  authResponseSchema,
  caseCreateSchema,
  caseDetailSchema,
  caseListResponseSchema,
  caseUpdateSchema,
  claimListSchema,
  claimSummarySchema,
  extractResponseSchema,
  healthResponseSchema,
  loginRequestSchema,
  medicineCreateSchema,
  medicineResponseSchema,
  medicineUpdateSchema,
  reconciliationResponseSchema,
  registerRequestSchema,
  stageUpdateSchema,
  statsSchema,
  transcribeResponseSchema,
  aiStatusSchema,
  dmsStageSchema,
} from "@dischargeiq/shared";

// Zod schema → JSON Schema. "input" describes what you SEND (before defaults/transforms are applied).
function shape(schema: z.ZodType, io: "input" | "output"): Record<string, unknown> {
  return z.toJSONSchema(schema, { target: "openapi-3.0", io, unrepresentable: "any" }) as Record<string, unknown>;
}

const schemas: Record<string, Record<string, unknown>> = {
  RegisterRequest: shape(registerRequestSchema, "input"),
  LoginRequest: shape(loginRequestSchema, "input"),
  AuthResponse: shape(authResponseSchema, "output"),
  CaseCreate: shape(caseCreateSchema, "input"),
  CaseUpdate: shape(caseUpdateSchema, "input"),
  CaseResponse: shape(z.object({ case: caseDetailSchema }), "output"),
  CaseList: shape(caseListResponseSchema, "output"),
  MedicineCreate: shape(medicineCreateSchema, "input"),
  MedicineUpdate: shape(medicineUpdateSchema, "input"),
  MedicineResponse: shape(medicineResponseSchema, "output"),
  ExtractResponse: shape(extractResponseSchema, "output"),
  TranscribeResponse: shape(transcribeResponseSchema, "output"),
  Reconciliation: shape(reconciliationResponseSchema, "output"),
  StageUpdate: shape(stageUpdateSchema, "input"),
  Stages: shape(z.object({ stages: z.array(dmsStageSchema) }), "output"),
  ClaimResponse: shape(z.object({ claim: claimSummarySchema }), "output"),
  ClaimList: shape(claimListSchema, "output"),
  Stats: shape(statsSchema, "output"),
  AiStatus: shape(aiStatusSchema, "output"),
  Health: shape(healthResponseSchema, "output"),
  Error: shape(z.object({ error: z.string(), fields: z.record(z.string(), z.string()).optional() }), "output"),
};

const ref = (name: string): { $ref: string } => ({ $ref: `#/components/schemas/${name}` });
const json = (name: string): Record<string, unknown> => ({ content: { "application/json": { schema: ref(name) } } });
const ok = (name: string, description = "OK"): Record<string, unknown> => ({ description, ...json(name) });
const error = (description: string): Record<string, unknown> => ({ description, ...json("Error") });

// Answers most logged-in routes can give. 404 is also the answer for someone else's case (golden rule 12, D-043).
const common = {
  "401": error("Not logged in"),
  "404": error("Not found, or not yours"),
};
const caseId = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const stage = { name: "stage", in: "path", required: true, schema: { type: "integer", enum: [1, 2, 3] } };
const loggedIn = [{ sessionCookie: [] }];

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "DischargeIQ API",
    version: "1.0.0",
    description:
      "Prototype API for NHS Discharge Medicines Service referrals. **Synthetic data only.** " +
      "Log in with POST /api/auth/login; the session is an HttpOnly cookie, so the browser sends it for you. " +
      "Every case route checks that the case is yours (otherwise 404).",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "diq_session" } },
    schemas,
  },
  tags: [
    { name: "Auth" },
    { name: "Cases" },
    { name: "Medicines" },
    { name: "Comparison" },
    { name: "Stages and claims" },
    { name: "Demo cases (public)" },
    { name: "Utility" },
  ],
  paths: {
    "/auth/register": { post: { tags: ["Auth"], summary: "Create an account (logs you in)", requestBody: json("RegisterRequest"), responses: { "201": ok("AuthResponse", "Created"), "400": error("Invalid details"), "409": error("Email already registered"), "429": error("Too many attempts") } } },
    "/auth/login": { post: { tags: ["Auth"], summary: "Log in (sets the session cookie)", requestBody: json("LoginRequest"), responses: { "200": ok("AuthResponse"), "401": error("Email or password incorrect"), "429": error("Too many failed attempts") } } },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Log out (deletes the cookie)", responses: { "204": { description: "Logged out" } } } },
    "/auth/me": { get: { tags: ["Auth"], summary: "Who is logged in", security: loggedIn, responses: { "200": ok("AuthResponse"), "401": error("Not logged in") } } },

    "/cases": {
      get: { tags: ["Cases"], summary: "Your cases", security: loggedIn, responses: { "200": ok("CaseList"), "401": common["401"] } },
      post: { tags: ["Cases"], summary: "Create a case (and its three DMS stages)", security: loggedIn, requestBody: json("CaseCreate"), responses: { "201": ok("CaseResponse", "Created"), "400": error("Invalid details, e.g. a real NHS number"), "409": error("Reference already used"), "401": common["401"] } },
    },
    "/cases/{id}": {
      parameters: [caseId],
      get: { tags: ["Cases"], summary: "One case with its medicines and stages", security: loggedIn, responses: { "200": ok("CaseResponse"), ...common } },
      patch: { tags: ["Cases"], summary: "Change the reference, referral time, hospital or letter", security: loggedIn, requestBody: json("CaseUpdate"), responses: { "200": ok("CaseResponse"), "400": error("Invalid details"), ...common } },
      delete: { tags: ["Cases"], summary: "Delete a case", security: loggedIn, responses: { "204": { description: "Deleted" }, ...common } },
    },
    "/cases/{id}/medicines": {
      parameters: [caseId],
      post: { tags: ["Medicines"], summary: "Add a medicine to one of the three lists", security: loggedIn, requestBody: json("MedicineCreate"), responses: { "201": ok("MedicineResponse", "Created"), "400": error("Invalid details"), ...common } },
    },
    "/medicines/{id}": {
      parameters: [{ ...caseId, description: "Medicine id" }],
      patch: { tags: ["Medicines"], summary: "Edit a medicine (it gets a new id, so its line must be checked again)", security: loggedIn, requestBody: json("MedicineUpdate"), responses: { "200": ok("MedicineResponse"), "400": error("Invalid details"), ...common } },
      delete: { tags: ["Medicines"], summary: "Delete a medicine", security: loggedIn, responses: { "204": { description: "Deleted" }, ...common } },
    },
    "/cases/{id}/extract": {
      parameters: [caseId],
      post: { tags: ["Comparison"], summary: "Read the letter (AI extracts only; replaces the discharge list)", security: loggedIn, responses: { "200": ok("ExtractResponse"), "400": error("No letter yet, or it still has [unclear] parts"), "429": error("Rate limited"), "503": error("Letter reader unavailable or answer unusable: add medicines by hand"), ...common } },
    },
    "/cases/{id}/transcribe": {
      parameters: [caseId, { name: "synthetic", in: "query", required: true, description: "Must be \"confirmed\": the user ticked \"this is a synthetic letter\"", schema: { type: "string", enum: ["confirmed"] } }],
      post: {
        tags: ["Comparison"],
        summary: "Upload a PDF or photo of the letter; the AI copies it out as text (nothing is saved; the file is held in memory only)",
        security: loggedIn,
        requestBody: { required: true, content: { "application/pdf": { schema: { type: "string", format: "binary" } }, "image/png": { schema: { type: "string", format: "binary" } }, "image/jpeg": { schema: { type: "string", format: "binary" } } } },
        responses: { "200": ok("TranscribeResponse"), "400": error("Synthetic tick box not confirmed"), "413": error("File over 4 MB"), "415": error("Not a PDF, PNG or JPEG (checked from the file's bytes)"), "422": error("Real NHS number in the letter, or (demo mode) not a sample file"), "429": error("Rate limited"), "503": error("Couldn't read the file, or the reader is unavailable: paste the text"), ...common },
      },
    },
    "/cases/{id}/reconciliation": {
      parameters: [caseId, { name: "stage", in: "query", schema: { type: "integer", enum: [1, 2], default: 1 } }],
      get: { tags: ["Comparison"], summary: "The comparison (stage 1: before admission → discharge; stage 2: discharge → new prescription)", security: loggedIn, responses: { "200": ok("Reconciliation"), ...common } },
    },
    "/cases/{id}/stages/{stage}": {
      parameters: [caseId, stage],
      patch: { tags: ["Stages and claims"], summary: "Autosave notes, check or un-check a line, not applicable (with reason), reopen", security: loggedIn, requestBody: json("StageUpdate"), responses: { "200": ok("Stages"), "400": error("Invalid change"), "409": error("Stage completed or case claimed"), ...common } },
    },
    "/cases/{id}/stages/{stage}/complete": {
      parameters: [caseId, stage],
      post: { tags: ["Stages and claims"], summary: "Complete a stage (the server re-runs the comparison)", security: loggedIn, responses: { "200": ok("Stages"), "400": error("List missing"), "409": error("Lines still need checking (count in `unresolved`), already completed, or claimed"), ...common } },
    },
    "/cases/{id}/claim-summary": {
      parameters: [caseId],
      get: { tags: ["Stages and claims"], summary: "Claim record: fields in MYS order, value, claim-by date", security: loggedIn, responses: { "200": ok("ClaimResponse"), ...common } },
    },
    "/cases/{id}/mark-claimed": {
      parameters: [caseId],
      post: { tags: ["Stages and claims"], summary: "Record that you claimed it in MYS", security: loggedIn, responses: { "200": ok("ClaimResponse"), "409": error("Not ready to claim"), ...common } },
    },
    "/claims": { get: { tags: ["Stages and claims"], summary: "Claim records for your cases", security: loggedIn, responses: { "200": ok("ClaimList"), "401": common["401"] } } },
    "/stats": { get: { tags: ["Stages and claims"], summary: "What your comparisons found, and claim value", security: loggedIn, responses: { "200": ok("Stats"), "401": common["401"] } } },

    "/demo-cases": { get: { tags: ["Demo cases (public)"], summary: "Synthetic demo cases", responses: { "200": ok("CaseList") } } },
    "/demo-cases/{id}": { parameters: [caseId], get: { tags: ["Demo cases (public)"], summary: "One demo case (read-only)", responses: { "200": ok("CaseResponse"), "404": common["404"] } } },
    "/demo-cases/{id}/reconciliation": { parameters: [caseId], get: { tags: ["Demo cases (public)"], summary: "A demo case's comparison", responses: { "200": ok("Reconciliation"), "404": common["404"] } } },
    "/demo-cases/{id}/copy": { parameters: [caseId], post: { tags: ["Demo cases (public)"], summary: "Copy a demo case into your cases (letter + pre-admission list)", security: loggedIn, responses: { "201": ok("CaseResponse", "Created"), ...common } } },

    "/ai/status": { get: { tags: ["Utility"], summary: "Letter reader mode: mock (sample) or live (Claude)", responses: { "200": ok("AiStatus") } } },
    "/health": { get: { tags: ["Utility"], summary: "API and database check (used by the uptime ping)", responses: { "200": ok("Health"), "503": ok("Health", "Database unavailable") } } },
  },
};
