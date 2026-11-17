// Letter upload (D-054): file checks, the transcript check (Zod + NHS number guard + [unclear]), demo mode, and the
// route's rules (login, ownership, synthetic tick box, file type and size, nothing saved), against the TEST database.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { caseResponseSchema, MAX_UPLOAD_BYTES, transcribeResponseSchema } from "@dischargeiq/shared";
import { createApp } from "../app";
import { getPool } from "../db/pool";
import { DMS_0042 } from "../db/demoCases";
import { DEMO_LETTER_FILES } from "../db/demoLetterFiles";
import { checkTranscript, detectLetterFile, fingerprint } from "../services/letterFile.service";
import { SESSION_COOKIE, signSessionToken } from "../services/session.service";

const TEST_DOMAIN = "transcribe-test.example.com";
const app = createApp();
const demoFile = (name: string): Buffer => readFileSync(resolve(process.cwd(), "../client/public/demo-letters", name));

// A real-looking (Modulus 11 valid) NHS number outside the 999 test range, built here so no number is hard-coded.
function realLookingNhsNumber(): string {
  const start = "401023456";
  let total = 0;
  for (let i = 0; i < 9; i++) total += Number(start[i]) * (10 - i);
  return start + String((11 - (total % 11)) % 11);
}

const PNG_START = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("detectLetterFile (by the file's first bytes, not its label)", () => {
  it("recognises PDF, PNG and JPEG", () => {
    expect(detectLetterFile(Buffer.from("%PDF-1.7 rest"))).toBe("pdf");
    expect(detectLetterFile(Buffer.concat([PNG_START, Buffer.from("rest")]))).toBe("png");
    expect(detectLetterFile(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
  });
  it("refuses anything else, including text pretending to be a file", () => {
    expect(detectLetterFile(Buffer.from("hello"))).toBeNull();
    expect(detectLetterFile(Buffer.from("<svg></svg>"))).toBeNull();
    expect(detectLetterFile(Buffer.alloc(0))).toBeNull();
  });
});

describe("checkTranscript (golden rule 5 + NHS number guard)", () => {
  it("accepts a normal transcript and counts the [unclear] parts", () => {
    const result = checkTranscript({ letter_text: "Amlodipine [unclear] mg once daily. [ Unclear ] dose." });
    expect(result).toEqual({ ok: true, letterText: "Amlodipine [unclear] mg once daily. [ Unclear ] dose.", unclearCount: 2 });
  });
  it("allows NHS test numbers (999 range)", () => {
    expect(checkTranscript({ letter_text: "NHS number: 999 000 0018" }).ok).toBe(true);
  });
  it("throws away a transcript with a real NHS number", () => {
    expect(checkTranscript({ letter_text: `NHS number: ${realLookingNhsNumber()}` })).toEqual({ ok: false, reason: "realNhsNumber" });
  });
  it("rejects answers of the wrong shape, empty, too long, or nothing but [unclear]", () => {
    expect(checkTranscript({ text: "wrong field" }).ok).toBe(false);
    expect(checkTranscript({ letter_text: "   " }).ok).toBe(false);
    expect(checkTranscript({ letter_text: "a".repeat(20001) }).ok).toBe(false);
    expect(checkTranscript({ letter_text: "[unclear]" })).toEqual({ ok: false, reason: "unreadable" });
  });
});

describe("demo letter files", () => {
  for (const file of DEMO_LETTER_FILES) {
    it(`${file.file}: the fingerprint matches the file the app serves`, () => {
      expect(fingerprint(demoFile(file.file))).toBe(file.sha256);
    });
  }
});

// ---- The route ----------------------------------------------------------------------------------------------------

async function createUser(): Promise<string> {
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name) VALUES ($1, 'not-a-real-hash', 'Upload test') RETURNING id`,
    [`user-${crypto.randomUUID()}@${TEST_DOMAIN}`],
  );
  return result.rows[0].id;
}
const cookieFor = (userId: string): string => `${SESSION_COOKIE}=${signSessionToken({ id: userId, role: "pharmacist" })}`;

async function newCase(owner: string, letterText?: string): Promise<string> {
  const res = await request(app)
    .post("/api/cases")
    .set("Cookie", cookieFor(owner))
    .send({ reference: `DMS-${crypto.randomUUID().slice(0, 8)}`, letterText });
  expect(res.status).toBe(201);
  return caseResponseSchema.parse(res.body).case.id;
}

function upload(caseId: string, owner: string | null, file: Buffer, type = "application/pdf", synthetic = true): request.Test {
  const req = request(app)
    .post(`/api/cases/${caseId}/transcribe${synthetic ? "?synthetic=confirmed" : ""}`)
    .set("Content-Type", type);
  if (owner) req.set("Cookie", cookieFor(owner));
  return req.send(file);
}

let alice = "";
let bob = "";
let aliceCase = "";

async function cleanUp(): Promise<void> {
  await getPool().query(`DELETE FROM users WHERE email LIKE $1`, [`%@${TEST_DOMAIN}`]);
}
beforeAll(async () => {
  await cleanUp();
  alice = await createUser();
  bob = await createUser();
  aliceCase = await newCase(alice);
});
afterAll(cleanUp);

describe("POST /api/cases/:id/transcribe", () => {
  it("needs a login (401) and the case must be yours (404)", async () => {
    expect((await upload(aliceCase, null, demoFile("dms-0042-letter.pdf"))).status).toBe(401);
    expect((await upload(aliceCase, bob, demoFile("dms-0042-letter.pdf"))).status).toBe(404);
  });

  it("refuses an upload without the synthetic tick box (400)", async () => {
    const res = await upload(aliceCase, alice, demoFile("dms-0042-letter.pdf"), "application/pdf", false);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/synthetic/);
  });

  it("refuses other file types, and files whose bytes don't match their label (415)", async () => {
    expect((await upload(aliceCase, alice, Buffer.from("hello"), "text/plain")).status).toBe(415);
    expect((await upload(aliceCase, alice, Buffer.from("hello"), "image/png")).status).toBe(415);
  });

  it("refuses a file over the size limit (413, friendly message)", async () => {
    const big = Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(MAX_UPLOAD_BYTES)]);
    const res = await upload(aliceCase, alice, big);
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "That's too much to send at once. Use shorter text or a file under 4 MB." });
  });

  it("demo mode reads the sample PDF and photo, and saves NOTHING to the case", async () => {
    for (const [name, type] of [["dms-0042-letter.pdf", "application/pdf"], ["dms-0042-letter-photo.jpg", "image/jpeg"]]) {
      const res = await upload(aliceCase, alice, demoFile(name), type);
      expect(res.status).toBe(200);
      expect(transcribeResponseSchema.parse(res.body)).toEqual({ mode: "mock", letterText: DMS_0042.letterText, unclearCount: 0 });
    }
    const after = await request(app).get(`/api/cases/${aliceCase}`).set("Cookie", cookieFor(alice));
    expect(caseResponseSchema.parse(after.body).case.letterText).toBeNull();
  });

  it("demo mode politely refuses any other file (422)", async () => {
    const res = await upload(aliceCase, alice, Buffer.concat([PNG_START, Buffer.from(crypto.randomUUID())]), "image/png");
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/sample letter files/);
  });
});

describe("reading a letter that still has [unclear] parts", () => {
  it("is blocked on the server (400) until every [unclear] is replaced", async () => {
    const caseId = await newCase(alice, "Amlodipine [unclear] mg once daily.");
    const blocked = await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookieFor(alice));
    expect(blocked.status).toBe(400);
    expect(blocked.body.error).toMatch(/1 \[unclear\] part/);

    await request(app).patch(`/api/cases/${caseId}`).set("Cookie", cookieFor(alice)).send({ letterText: "Amlodipine 10 mg once daily." });
    const allowed = await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookieFor(alice));
    expect(allowed.status).toBe(200);
  });
});
