// Cases, medicines, AI extraction (mock), comparison and demo cases, against the TEST database.
// Golden rule 12 is tested on EVERY case and medicine route: another user gets 404, nobody logged in gets 401.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { caseResponseSchema, extractResponseSchema, reconciliationResponseSchema } from "@dischargeiq/shared";
import { createApp } from "../app";
import { getPool } from "../db/pool";
import { seedDemoCases } from "../db/seedDemoCases";
import { DMS_0042 } from "../db/demoCases";
import { SESSION_COOKIE, signSessionToken } from "../services/session.service";

const TEST_DOMAIN = "cases-test.example.com";
const app = createApp();

async function createUser(): Promise<string> {
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name) VALUES ($1, 'not-a-real-hash', 'Case test') RETURNING id`,
    [`user-${crypto.randomUUID()}@${TEST_DOMAIN}`],
  );
  return result.rows[0].id;
}

function cookieFor(userId: string): string {
  return `${SESSION_COOKIE}=${signSessionToken({ id: userId, role: "pharmacist" })}`;
}

// A real-looking (Modulus 11 valid) NHS number outside the 999 test range, built here so no number is hard-coded.
function realLookingNhsNumber(): string {
  const start = "401023456";
  let total = 0;
  for (let i = 0; i < 9; i++) total += Number(start[i]) * (10 - i);
  return start + String((11 - (total % 11)) % 11);
}

let alice = "";
let bob = "";

async function cleanUp(): Promise<void> {
  await getPool().query(`DELETE FROM users WHERE email LIKE $1`, [`%@${TEST_DOMAIN}`]);
}

beforeAll(async () => {
  await cleanUp();
  await seedDemoCases(getPool());
  alice = await createUser();
  bob = await createUser();
});
afterAll(cleanUp);

async function newCase(owner: string, body: Record<string, unknown> = {}): Promise<string> {
  const res = await request(app)
    .post("/api/cases")
    .set("Cookie", cookieFor(owner))
    .send({ reference: `DMS-${crypto.randomUUID().slice(0, 8)}`, ...body });
  expect(res.status).toBe(201);
  return caseResponseSchema.parse(res.body).case.id;
}

async function addMedicine(owner: string, caseId: string, body: Record<string, unknown>): Promise<string> {
  const res = await request(app).post(`/api/cases/${caseId}/medicines`).set("Cookie", cookieFor(owner)).send(body);
  expect(res.status).toBe(201);
  return res.body.medicine.id;
}

// ---- Cases --------------------------------------------------------------------------------------------------------

describe("cases", () => {
  it("creates a case with its three DMS stages, all pending", async () => {
    const res = await request(app)
      .post("/api/cases")
      .set("Cookie", cookieFor(alice))
      .send({ reference: "DMS-0101", hospitalName: "Synthetic General", letterText: "Synthetic letter." });
    expect(res.status).toBe(201);
    const detail = caseResponseSchema.parse(res.body).case;
    expect(detail.stages.map((s) => [s.stage, s.status])).toEqual([[1, "pending"], [2, "pending"], [3, "pending"]]);
    expect(detail.status).toBe("draft");
  });

  it("refuses a reference you've already used (409) and an empty one (400)", async () => {
    await newCase(alice, { reference: "DMS-DUPE" });
    const duplicate = await request(app).post("/api/cases").set("Cookie", cookieFor(alice)).send({ reference: "dms-dupe".toUpperCase() });
    expect(duplicate.status).toBe(409);
    const empty = await request(app).post("/api/cases").set("Cookie", cookieFor(alice)).send({ reference: "  " });
    expect(empty.status).toBe(400);
    expect(empty.body.fields.reference).toBeDefined();
  });

  it("lists only your own cases, not other users' or demo cases", async () => {
    const mine = await newCase(alice);
    const theirs = await newCase(bob);
    const res = await request(app).get("/api/cases").set("Cookie", cookieFor(alice));
    const ids = res.body.cases.map((c: { id: string }) => c.id);
    expect(ids).toContain(mine);
    expect(ids).not.toContain(theirs);
    expect(res.body.cases.every((c: { isDemo: boolean }) => !c.isDemo)).toBe(true);
  });

  it("updates only the fields sent, and deletes", async () => {
    const id = await newCase(alice, { hospitalName: "Before" });
    const patched = await request(app).patch(`/api/cases/${id}`).set("Cookie", cookieFor(alice)).send({ letterText: "New letter." });
    expect(patched.status).toBe(200);
    expect(patched.body.case.hospitalName).toBe("Before");
    expect(patched.body.case.letterText).toBe("New letter.");

    const deleted = await request(app).delete(`/api/cases/${id}`).set("Cookie", cookieFor(alice));
    expect(deleted.status).toBe(204);
    const gone = await request(app).get(`/api/cases/${id}`).set("Cookie", cookieFor(alice));
    expect(gone.status).toBe(404);
  });
});

// ---- NHS number guard (D-030) ----------------------------------------------------------------------------------

describe("NHS number guard", () => {
  it("refuses a letter containing a real-looking NHS number", async () => {
    const res = await request(app)
      .post("/api/cases")
      .set("Cookie", cookieFor(alice))
      .send({ reference: "DMS-GUARD", letterText: `Patient NHS number ${realLookingNhsNumber()}.` });
    expect(res.status).toBe(400);
    expect(res.body.fields.letterText).toMatch(/real NHS number/);
  });

  it("refuses one added later by editing, and in a medicine name", async () => {
    const id = await newCase(alice);
    const patch = await request(app).patch(`/api/cases/${id}`).set("Cookie", cookieFor(alice)).send({ letterText: realLookingNhsNumber() });
    expect(patch.status).toBe(400);
    const med = await request(app)
      .post(`/api/cases/${id}/medicines`)
      .set("Cookie", cookieFor(alice))
      .send({ listType: "pre_admission", name: `Ramipril ${realLookingNhsNumber()}` });
    expect(med.status).toBe(400);
  });

  it("allows the 999 test range (the demo letter uses one)", async () => {
    await newCase(alice, { letterText: DMS_0042.letterText });
  });

  it("refuses a 10-digit number as the case reference", async () => {
    const res = await request(app).post("/api/cases").set("Cookie", cookieFor(alice)).send({ reference: "999 000 0018" });
    expect(res.status).toBe(400);
  });
});

// ---- Medicines -------------------------------------------------------------------------------------------------------

describe("medicines", () => {
  it("adds, edits (new id, marked as edited, other fields kept) and deletes", async () => {
    const caseId = await newCase(alice);
    const medId = await addMedicine(alice, caseId, { listType: "pre_admission", name: "Amlodipine", strength: "5 mg", frequency: "each morning" });

    const edited = await request(app).patch(`/api/medicines/${medId}`).set("Cookie", cookieFor(alice)).send({ strength: "10 mg" });
    expect(edited.status).toBe(200);
    expect(edited.body.medicine.id).not.toBe(medId);
    expect(edited.body.medicine).toMatchObject({ name: "Amlodipine", strength: "10 mg", frequency: "each morning", editedByUser: true });

    const deleted = await request(app).delete(`/api/medicines/${edited.body.medicine.id}`).set("Cookie", cookieFor(alice));
    expect(deleted.status).toBe(204);
    const detail = await request(app).get(`/api/cases/${caseId}`).set("Cookie", cookieFor(alice));
    expect(detail.body.case.medicines).toHaveLength(0);
  });

  it("turns empty optional fields into null and refuses an unknown list", async () => {
    const caseId = await newCase(alice);
    const res = await request(app)
      .post(`/api/cases/${caseId}/medicines`)
      .set("Cookie", cookieFor(alice))
      .send({ listType: "pre_admission", name: "Atorvastatin", strength: "", dose: "  " });
    expect(res.body.medicine.strength).toBeNull();
    expect(res.body.medicine.dose).toBeNull();
    const bad = await request(app).post(`/api/cases/${caseId}/medicines`).set("Cookie", cookieFor(alice)).send({ listType: "shopping", name: "X" });
    expect(bad.status).toBe(400);
  });
});

// ---- Ownership on every route (golden rule 12) --------------------------------------------------------------------------

describe("ownership: another user can't reach Alice's case or medicines", () => {
  let caseId = "";
  let medId = "";
  beforeAll(async () => {
    caseId = await newCase(alice, { letterText: DMS_0042.letterText });
    medId = await addMedicine(alice, caseId, { listType: "pre_admission", name: "Warfarin", strength: "3 mg" });
  });

  const routes: [string, string, (ids: { caseId: string; medId: string }) => string, object?][] = [
    ["get", "GET /cases/:id", (ids) => `/api/cases/${ids.caseId}`],
    ["patch", "PATCH /cases/:id", (ids) => `/api/cases/${ids.caseId}`, { hospitalName: "Hacked" }],
    ["delete", "DELETE /cases/:id", (ids) => `/api/cases/${ids.caseId}`],
    ["post", "POST /cases/:id/medicines", (ids) => `/api/cases/${ids.caseId}/medicines`, { listType: "discharge", name: "X" }],
    ["post", "POST /cases/:id/extract", (ids) => `/api/cases/${ids.caseId}/extract`],
    ["get", "GET /cases/:id/reconciliation", (ids) => `/api/cases/${ids.caseId}/reconciliation`],
    ["patch", "PATCH /medicines/:id", (ids) => `/api/medicines/${ids.medId}`, { name: "Hacked" }],
    ["delete", "DELETE /medicines/:id", (ids) => `/api/medicines/${ids.medId}`],
  ];

  for (const [method, label, url, body] of routes) {
    it(`${label}: 404 for Bob, 401 for nobody`, async () => {
      const path = url({ caseId, medId });
      const asBob = await request(app)[method as "get"](path).set("Cookie", cookieFor(bob)).send(body);
      expect(asBob.status).toBe(404);
      const asNobody = await request(app)[method as "get"](path).send(body);
      expect(asNobody.status).toBe(401);
    });
  }

  it("Alice's case and medicine are untouched afterwards", async () => {
    const res = await request(app).get(`/api/cases/${caseId}`).set("Cookie", cookieFor(alice));
    expect(res.status).toBe(200);
    expect(res.body.case.hospitalName).toBeNull();
    expect(res.body.case.medicines.map((m: { name: string }) => m.name)).toEqual(["Warfarin"]);
  });
});

// ---- AI extraction (mock provider) and comparison ----------------------------------------------------------------------

describe("extraction and comparison", () => {
  it("reports mock mode in tests", async () => {
    const res = await request(app).get("/api/ai/status");
    expect(res.body).toEqual({ mode: "mock" });
  });

  it("asks for the letter first", async () => {
    const caseId = await newCase(alice);
    const res = await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookieFor(alice));
    expect(res.status).toBe(400);
  });

  it("extracts the DMS-0042 letter and compares it with the pre-admission list", async () => {
    const caseId = await newCase(alice, { letterText: DMS_0042.letterText });
    for (const m of DMS_0042.preAdmission) {
      await addMedicine(alice, caseId, { listType: "pre_admission", ...m });
    }

    const extracted = await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookieFor(alice));
    expect(extracted.status).toBe(200);
    const body = extractResponseSchema.parse(extracted.body);
    expect(body.mode).toBe("mock");
    expect(body.medicines).toHaveLength(8);
    expect(body.medicines.every((m) => m.listType === "discharge" && m.sourceText)).toBe(true);

    // Reading again replaces the list rather than doubling it.
    await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookieFor(alice));
    const detail = await request(app).get(`/api/cases/${caseId}`).set("Cookie", cookieFor(alice));
    expect(detail.body.case.medicines.filter((m: { listType: string }) => m.listType === "discharge")).toHaveLength(8);
    expect(detail.body.case.status).toBe("in_progress");

    const comparison = await request(app).get(`/api/cases/${caseId}/reconciliation?stage=1`).set("Cookie", cookieFor(alice));
    const lines = reconciliationResponseSchema.parse(comparison.body).lines;
    expect(lines).toHaveLength(8);
    expect(lines.filter((l) => l.needsReview)).toHaveLength(2);
    expect(lines.find((l) => l.from?.name === "Warfarin")).toMatchObject({ changeType: "stopped", highRisk: true, letterStatus: "withheld" });
  });

  it("flags a line whose quoted sentence is no longer in the letter (hallucination check)", async () => {
    const caseId = await newCase(alice, { letterText: DMS_0042.letterText });
    await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookieFor(alice));
    const without = DMS_0042.letterText.replace("Lansoprazole 30 mg once daily started.", "");
    await request(app).patch(`/api/cases/${caseId}`).set("Cookie", cookieFor(alice)).send({ letterText: without });

    const res = await request(app).get(`/api/cases/${caseId}/reconciliation`).set("Cookie", cookieFor(alice));
    const line = res.body.lines.find((l: { to: { name: string } | null }) => l.to?.name === "Lansoprazole");
    expect(line.needsReview).toBe(true);
    expect(line.reviewReasons.join(" ")).toContain("isn't in the letter");
  });

  it("stage 2 compares the discharge list with the new prescription", async () => {
    const caseId = await newCase(alice, { letterText: DMS_0042.letterText });
    await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookieFor(alice));
    await addMedicine(alice, caseId, { listType: "new_prescription", name: "Amlodipine", strength: "10 mg", frequency: "once daily" });

    const res = await request(app).get(`/api/cases/${caseId}/reconciliation?stage=2`).set("Cookie", cookieFor(alice));
    const body = reconciliationResponseSchema.parse(res.body);
    expect(body.stage).toBe(2);
    // Withheld warfarin and stopped naproxen aren't expected on the new prescription, so they don't appear.
    expect(body.lines.some((l) => l.from?.name === "Warfarin" || l.from?.name === "Naproxen")).toBe(false);
    expect(body.lines.find((l) => l.from?.name === "Amlodipine")?.changeType).toBe("unchanged");
    expect(body.lines.find((l) => l.from?.name === "Lansoprazole")?.reviewReasons).toContain(
      "Not on the new prescription: check whether it was stopped on purpose.",
    );
  });
});

// ---- Demo cases (public, read-only) ------------------------------------------------------------------------------------

describe("demo cases", () => {
  let demoId = "";
  beforeAll(async () => {
    const res = await request(app).get("/api/demo-cases");
    demoId = res.body.cases.find((c: { reference: string }) => c.reference === "DMS-0042").id;
  });

  it("can be listed and opened without logging in, with its comparison", async () => {
    const detail = await request(app).get(`/api/demo-cases/${demoId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.case.isDemo).toBe(true);
    const comparison = await request(app).get(`/api/demo-cases/${demoId}/reconciliation`);
    expect(comparison.body.lines).toHaveLength(8);
  });

  it("can't be changed through the normal case routes (not your case)", async () => {
    const res = await request(app).patch(`/api/cases/${demoId}`).set("Cookie", cookieFor(alice)).send({ hospitalName: "Changed" });
    expect(res.status).toBe(404);
  });

  it("a normal user's case can't be opened through the demo address", async () => {
    const mine = await newCase(alice);
    const res = await request(app).get(`/api/demo-cases/${mine}`);
    expect(res.status).toBe(404);
  });

  it("can be copied into your own cases (letter + pre-admission list), only when logged in", async () => {
    const anonymous = await request(app).post(`/api/demo-cases/${demoId}/copy`);
    expect(anonymous.status).toBe(401);

    const first = await request(app).post(`/api/demo-cases/${demoId}/copy`).set("Cookie", cookieFor(bob));
    expect(first.status).toBe(201);
    const copy = caseResponseSchema.parse(first.body).case;
    expect(copy.reference).toBe("DMS-0042 (copy)");
    expect(copy.isDemo).toBe(false);
    expect(copy.letterText).toBe(DMS_0042.letterText);
    expect(copy.medicines.filter((m) => m.listType === "pre_admission")).toHaveLength(7);
    expect(copy.medicines.filter((m) => m.listType === "discharge")).toHaveLength(0);

    const second = await request(app).post(`/api/demo-cases/${demoId}/copy`).set("Cookie", cookieFor(bob));
    expect(second.body.case.reference).toBe("DMS-0042 (copy 2)");
  });
});
