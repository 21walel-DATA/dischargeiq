// The DMS stage tracker, the approval gate and claims (D-021, D-032, D-036, D-048), against the TEST database.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  caseResponseSchema,
  claimByDate,
  claimListSchema,
  claimSummarySchema,
  earliestPaymentDate,
  initials,
  reconciliationResponseSchema,
  statsSchema,
  type DmsStage,
  type ReconciliationLine,
} from "@dischargeiq/shared";
import { createApp } from "../app";
import { getPool } from "../db/pool";
import { DMS_0042 } from "../db/demoCases";
import { seedDemoCases } from "../db/seedDemoCases";
import { SESSION_COOKIE, signSessionToken } from "../services/session.service";

const TEST_DOMAIN = "stages-test.example.com";
const app = createApp();
let alice = "";
let bob = "";

async function createUser(displayName: string): Promise<string> {
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name) VALUES ($1, 'not-a-real-hash', $2) RETURNING id`,
    [`user-${crypto.randomUUID()}@${TEST_DOMAIN}`, displayName],
  );
  return result.rows[0].id;
}
const cookie = (userId: string): string => `${SESSION_COOKIE}=${signSessionToken({ id: userId, role: "pharmacist" })}`;

async function cleanUp(): Promise<void> {
  await getPool().query(`DELETE FROM users WHERE email LIKE $1`, [`%@${TEST_DOMAIN}`]);
}
beforeAll(async () => {
  await cleanUp();
  alice = await createUser("Dina Patel");
  bob = await createUser("Bob Jones");
});
afterAll(cleanUp);

// A DMS-0042 case with its letter read: stage 1 has 8 lines, 2 of them need review.
async function readyCase(owner = alice): Promise<string> {
  const created = await request(app)
    .post("/api/cases")
    .set("Cookie", cookie(owner))
    .send({ reference: `DMS-${crypto.randomUUID().slice(0, 8)}`, letterText: DMS_0042.letterText });
  const caseId = caseResponseSchema.parse(created.body).case.id;
  for (const m of DMS_0042.preAdmission) {
    await request(app).post(`/api/cases/${caseId}/medicines`).set("Cookie", cookie(owner)).send({ listType: "pre_admission", ...m });
  }
  await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookie(owner));
  return caseId;
}

async function lines(caseId: string, stage: 1 | 2 = 1): Promise<ReconciliationLine[]> {
  const res = await request(app).get(`/api/cases/${caseId}/reconciliation?stage=${stage}`).set("Cookie", cookie(alice));
  return reconciliationResponseSchema.parse(res.body).lines;
}

function patch(caseId: string, stage: number, body: object, owner = alice): request.Test {
  return request(app).patch(`/api/cases/${caseId}/stages/${stage}`).set("Cookie", cookie(owner)).send(body);
}
function complete(caseId: string, stage: number, owner = alice): request.Test {
  return request(app).post(`/api/cases/${caseId}/stages/${stage}/complete`).set("Cookie", cookie(owner));
}
function stageOf(body: { stages: DmsStage[] }, stage: number): DmsStage {
  const found = body.stages.find((s) => s.stage === stage);
  if (!found) throw new Error("stage missing");
  return found;
}

// ---- The approval gate (D-032) --------------------------------------------------------------------------------------

describe("completing stage 1 (the approval gate)", () => {
  it("is refused (409) while flagged lines are unchecked, and says how many", async () => {
    const caseId = await readyCase();
    const res = await complete(caseId, 1);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ unresolved: 2, error: "2 lines still need checking before stage 1 can be completed." });
  });

  it("records who checked a line, when, and their note; then counts down", async () => {
    const caseId = await readyCase();
    const [first] = (await lines(caseId)).filter((l) => l.needsReview);
    const res = await patch(caseId, 1, { acknowledge: { key: first.key, note: "Same dose" } });
    expect(res.status).toBe(200);
    expect(stageOf(res.body, 1).acknowledgements).toEqual([
      expect.objectContaining({ key: first.key, byInitials: "DP", byName: "Dina Patel", note: "Same dose" }),
    ]);
    const blocked = await complete(caseId, 1);
    expect(blocked.body.unresolved).toBe(1);
  });

  it("refuses to acknowledge a line that doesn't need review, or doesn't exist", async () => {
    const caseId = await readyCase();
    const plain = (await lines(caseId)).find((l) => !l.needsReview);
    expect((await patch(caseId, 1, { acknowledge: { key: plain?.key } })).status).toBe(400);
    expect((await patch(caseId, 1, { acknowledge: { key: "from:x|to:y" } })).status).toBe(400);
  });

  it("completes once every flagged line is checked, and stores the comparison as the record", async () => {
    const caseId = await readyCase();
    for (const line of (await lines(caseId)).filter((l) => l.needsReview)) {
      await patch(caseId, 1, { acknowledge: { key: line.key } });
    }
    const res = await complete(caseId, 1);
    expect(res.status).toBe(200);
    expect(stageOf(res.body, 1)).toMatchObject({ status: "completed", completedByInitials: "DP" });

    const stored = await getPool().query<{ needs_review: boolean; review_acknowledged_by: string | null }>(
      `SELECT needs_review, review_acknowledged_by FROM reconciliation_items WHERE case_id = $1 AND stage = 1`,
      [caseId],
    );
    expect(stored.rows).toHaveLength(8);
    expect(stored.rows.filter((r) => r.needs_review).every((r) => r.review_acknowledged_by === alice)).toBe(true);
  });

  it("an edited medicine must be checked again (its line gets a new key)", async () => {
    const caseId = await readyCase();
    const flagged = (await lines(caseId)).filter((l) => l.needsReview);
    for (const line of flagged) await patch(caseId, 1, { acknowledge: { key: line.key } });
    const zestril = flagged.find((l) => l.to?.name === "Zestril");
    await request(app).patch(`/api/medicines/${zestril?.to?.id}`).set("Cookie", cookie(alice)).send({ dose: "one tablet" });

    const res = await complete(caseId, 1);
    expect(res.status).toBe(409);
    expect(res.body.unresolved).toBe(1);
  });

  it("un-checking a line puts it back", async () => {
    const caseId = await readyCase();
    const [first] = (await lines(caseId)).filter((l) => l.needsReview);
    await patch(caseId, 1, { acknowledge: { key: first.key } });
    const res = await patch(caseId, 1, { unacknowledge: first.key });
    expect(stageOf(res.body, 1).acknowledgements).toEqual([]);
  });

  it("needs a discharge list first", async () => {
    const created = await request(app).post("/api/cases").set("Cookie", cookie(alice)).send({ reference: `DMS-${crypto.randomUUID().slice(0, 8)}` });
    const res = await complete(created.body.case.id, 1);
    expect(res.status).toBe(400);
  });

  it("can be reopened, which clears the stored record; checks can't change while completed", async () => {
    const caseId = await readyCase();
    const flagged = (await lines(caseId)).filter((l) => l.needsReview);
    for (const line of flagged) await patch(caseId, 1, { acknowledge: { key: line.key } });
    await complete(caseId, 1);
    expect((await patch(caseId, 1, { unacknowledge: flagged[0].key })).status).toBe(409);
    expect((await complete(caseId, 1)).status).toBe(409); // already completed

    const reopened = await patch(caseId, 1, { status: "pending" });
    expect(stageOf(reopened.body, 1).status).toBe("pending");
    const stored = await getPool().query(`SELECT 1 FROM reconciliation_items WHERE case_id = $1`, [caseId]);
    expect(stored.rows).toHaveLength(0);
  });
});

// ---- Stage 2 re-check (D-048) ------------------------------------------------------------------------------------------

describe("stage 2: first new prescription", () => {
  it("blocks when the GP prescription ignores the hospital's change, until the pharmacist checks it", async () => {
    const caseId = await readyCase();
    // The discharge list says amlodipine 10 mg; the new prescription still says 5 mg.
    for (const m of [
      { name: "Amlodipine", strength: "5 mg", frequency: "once daily" },
      { name: "Lansoprazole", strength: "30 mg", frequency: "once daily" },
    ]) {
      await request(app).post(`/api/cases/${caseId}/medicines`).set("Cookie", cookie(alice)).send({ listType: "new_prescription", ...m });
    }
    const amlodipine = (await lines(caseId, 2)).find((l) => l.from?.name === "Amlodipine");
    expect(amlodipine).toMatchObject({ changeType: "changed", needsReview: true });
    expect(amlodipine?.reviewReasons[0]).toBe("The new prescription differs from the discharge list: check with the prescriber.");

    const blocked = await complete(caseId, 2);
    expect(blocked.status).toBe(409);
    for (const line of (await lines(caseId, 2)).filter((l) => l.needsReview)) {
      await patch(caseId, 2, { acknowledge: { key: line.key, note: "Prescriber contacted" } });
    }
    expect((await complete(caseId, 2)).status).toBe(200);
  });

  it("needs a new prescription, or 'not applicable' with a reason", async () => {
    const caseId = await readyCase();
    expect((await complete(caseId, 2)).status).toBe(400);
    const noReason = await patch(caseId, 2, { status: "not_applicable" });
    expect(noReason.status).toBe(400);
    expect(noReason.body.fields.notApplicableReason).toMatch(/Give a reason/);
    const ok = await patch(caseId, 2, { status: "not_applicable", notApplicableReason: "Readmitted before the first prescription" });
    expect(stageOf(ok.body, 2)).toMatchObject({ status: "not_applicable", notApplicableReason: "Readmitted before the first prescription" });
  });
});

// ---- Notes (autosave) --------------------------------------------------------------------------------------------------

describe("stage notes", () => {
  it("save, and refuse a real-looking NHS number", async () => {
    const caseId = await readyCase();
    const saved = await patch(caseId, 3, { notes: "Spoke to the patient's carer." });
    expect(stageOf(saved.body, 3).notes).toBe("Spoke to the patient's carer.");
    const start = "401023456";
    let total = 0;
    for (let i = 0; i < 9; i++) total += Number(start[i]) * (10 - i);
    const nhs = start + String((11 - (total % 11)) % 11);
    expect((await patch(caseId, 3, { notes: `NHS ${nhs}` })).status).toBe(400);
  });

  it("only stages 1, 2 and 3 exist", async () => {
    const caseId = await readyCase();
    expect((await patch(caseId, 4, { notes: "x" })).status).toBe(404);
  });
});

// ---- Claims (D-021, D-023, D-048) ----------------------------------------------------------------------------------------

describe("claim-ready rule and claiming", () => {
  it("is ready only when no stage is pending and stage 1 is completed; then it can be claimed once", async () => {
    const caseId = await readyCase();
    for (const line of (await lines(caseId)).filter((l) => l.needsReview)) await patch(caseId, 1, { acknowledge: { key: line.key } });
    await complete(caseId, 1);
    await patch(caseId, 2, { status: "not_applicable", notApplicableReason: "No new prescription received" });

    let claim = claimSummarySchema.parse((await request(app).get(`/api/cases/${caseId}/claim-summary`).set("Cookie", cookie(alice))).body.claim);
    expect(claim).toMatchObject({ claimStatus: "not_ready", value: 12, claimBy: null });
    expect((await request(app).post(`/api/cases/${caseId}/mark-claimed`).set("Cookie", cookie(alice))).status).toBe(409);

    await complete(caseId, 3);
    claim = claimSummarySchema.parse((await request(app).get(`/api/cases/${caseId}/claim-summary`).set("Cookie", cookie(alice))).body.claim);
    expect(claim).toMatchObject({ claimStatus: "ready", value: 24 });
    expect(claim.claimBy).toBe(claimByDate(claim.lastStageCompletedAt ?? ""));

    const claimed = await request(app).post(`/api/cases/${caseId}/mark-claimed`).set("Cookie", cookie(alice));
    expect(claimed.body.claim.claimStatus).toBe("claimed");
    expect((await request(app).post(`/api/cases/${caseId}/mark-claimed`).set("Cookie", cookie(alice))).status).toBe(409);
    // A claimed case is locked.
    expect((await patch(caseId, 3, { status: "pending" })).status).toBe(409);
  });

  it("stage 1 'not applicable' never makes a claim ready", async () => {
    const caseId = await readyCase();
    for (const stage of [1, 2, 3]) await patch(caseId, stage, { status: "not_applicable", notApplicableReason: "Patient declined" });
    const claim = (await request(app).get(`/api/cases/${caseId}/claim-summary`).set("Cookie", cookie(alice))).body.claim;
    expect(claim.claimStatus).toBe("not_ready");
  });

  it("claims and stats show only your own cases", async () => {
    const bobsCase = await readyCase(bob);
    const mine = claimListSchema.parse((await request(app).get("/api/claims").set("Cookie", cookie(alice))).body);
    expect(mine.claims.some((c) => c.caseId === bobsCase)).toBe(false);
    expect(mine.claims.length).toBeGreaterThan(0);

    const stats = statsSchema.parse((await request(app).get("/api/stats").set("Cookie", cookie(bob))).body);
    expect(stats.caseCount).toBe(1);
    expect(stats.lines).toMatchObject({ stopped: 2, started: 1, changed: 1, unchanged: 4, neededReview: 2 });
    expect(stats.highRisk).toEqual([{ category: "Anticoagulant", count: 1 }]);
  });
});

describe("claim-by date (owner's rule, D-048)", () => {
  it("completed in July → claim by 5 November; earliest payment if claimed by 5 August", () => {
    expect(claimByDate("2026-07-15T10:00:00.000Z")).toBe("2026-11-05");
    expect(earliestPaymentDate("2026-07-15T10:00:00.000Z")).toBe("2026-08-05");
  });
  it("rolls into the next year", () => {
    expect(claimByDate("2026-11-17T10:00:00.000Z")).toBe("2027-03-05");
    expect(earliestPaymentDate("2026-12-01T10:00:00.000Z")).toBe("2027-01-05");
  });
});

describe("initials for the 'Checked by' box", () => {
  it("takes the first and last name", () => {
    expect(initials("Dina Patel")).toBe("DP");
    expect(initials("  dina  van  patel ")).toBe("DP");
    expect(initials("Dina")).toBe("DI");
  });
});

// ---- Ownership (golden rule 12) ---------------------------------------------------------------------------------------

describe("ownership of stage and claim routes", () => {
  it("another user gets 404 on every route; nobody logged in gets 401", async () => {
    const caseId = await readyCase();
    const routes: [string, string, object?][] = [
      ["patch", `/api/cases/${caseId}/stages/1`, { notes: "Hacked" }],
      ["post", `/api/cases/${caseId}/stages/3/complete`],
      ["get", `/api/cases/${caseId}/claim-summary`],
      ["post", `/api/cases/${caseId}/mark-claimed`],
    ];
    for (const [method, url, body] of routes) {
      expect((await request(app)[method as "get"](url).set("Cookie", cookie(bob)).send(body)).status).toBe(404);
      expect((await request(app)[method as "get"](url).send(body)).status).toBe(401);
    }
    expect((await request(app).get("/api/claims")).status).toBe(401);
    expect((await request(app).get("/api/stats")).status).toBe(401);
    const stage = await request(app).get(`/api/cases/${caseId}`).set("Cookie", cookie(alice));
    expect(stageOf(stage.body.case, 1).notes).toBeNull();
  });

  it("demo cases can't be changed through the stage routes", async () => {
    await seedDemoCases(getPool());
    const demo = (await request(app).get("/api/demo-cases")).body.cases[0].id;
    expect((await patch(demo, 1, { notes: "x" })).status).toBe(404);
  });
});
