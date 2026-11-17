// Test sheet F6: what happens when the LIVE letter reader fails (bad answer, timeout, API error).
// Every other test uses the mock reader. Here we switch the app to "live" mode for this file only and replace the
// Anthropic SDK with a fake, so the real retry and failure code runs without a paid call or the network.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { caseResponseSchema } from "@dischargeiq/shared";
import { createApp } from "../app";
import { getPool } from "../db/pool";
import { DMS_0042 } from "../db/demoCases";
import { extractMedicines } from "../services/ai.service";
import { SESSION_COOKIE, signSessionToken } from "../services/session.service";

// vi.hoisted runs before the imports above, so the fake below can use these.
const fake = vi.hoisted(() => {
  class FakeAPIError extends Error {
    status: number;
    constructor(status: number) {
      super("fake API error");
      this.status = status;
    }
  }
  return { parse: vi.fn(), FakeAPIError };
});

// The fake SDK: `new Anthropic()` gives an object whose messages.parse is our vi.fn().
vi.mock("@anthropic-ai/sdk", () => {
  class FakeAnthropic {
    static APIError = fake.FakeAPIError;
    messages = { parse: fake.parse };
  }
  return { default: FakeAnthropic };
});

const BAD_ANSWER = { stop_reason: "end_turn", parsed_output: { medicines: [{ name: 42 }] } }; // fails our Zod schema
const GOOD_ANSWER = { stop_reason: "end_turn", parsed_output: { medicines: DMS_0042.extraction } };

beforeEach(() => {
  // aiMode() is "live" only when VITEST is empty and a key is set. The key is fake: the SDK is fake too.
  vi.stubEnv("VITEST", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "not-a-real-key");
  fake.parse.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("live letter reader: failure path (F6)", () => {
  it("a bad answer is retried once, then given up as unreadable", async () => {
    fake.parse.mockResolvedValue(BAD_ANSWER);
    const result = await extractMedicines(DMS_0042.letterText);
    expect(fake.parse).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: false, mode: "live", reason: "unreadable" });
  });

  it("a bad answer followed by a good one is used (the retry works)", async () => {
    fake.parse.mockResolvedValueOnce(BAD_ANSWER).mockResolvedValueOnce(GOOD_ANSWER);
    const result = await extractMedicines(DMS_0042.letterText);
    expect(fake.parse).toHaveBeenCalledTimes(2);
    expect(result.ok && result.medicines).toEqual(DMS_0042.extraction);
  });

  it("an answer cut short (max_tokens) counts as a bad answer", async () => {
    fake.parse.mockResolvedValue({ stop_reason: "max_tokens", parsed_output: null });
    const result = await extractMedicines(DMS_0042.letterText);
    expect(fake.parse).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
  });

  it("an API error (e.g. overloaded) gives up as unavailable, logging only the status", async () => {
    fake.parse.mockRejectedValue(new fake.FakeAPIError(529));
    const result = await extractMedicines(DMS_0042.letterText);
    expect(result).toEqual({ ok: false, mode: "live", reason: "unavailable" });
    expect(console.error).toHaveBeenCalledWith("AI request failed with status 529");
  });

  it("a timeout or network error gives up as unavailable, and its message never reaches the log", async () => {
    const timeout = Object.assign(new Error("connect timeout to secret-host.example.com"), { name: "TimeoutError" });
    fake.parse.mockRejectedValue(timeout);
    const result = await extractMedicines(DMS_0042.letterText);
    expect(result).toEqual({ ok: false, mode: "live", reason: "unavailable" });
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("TimeoutError");
    expect(logged).not.toContain("secret-host");
  });
});

// ---- Through the API: the pharmacist gets a friendly 503 and a way forward ---------------------------------------

const TEST_DOMAIN = "ai-failure-test.example.com";
const app = createApp();
let userId = "";

async function cleanUp(): Promise<void> {
  await getPool().query(`DELETE FROM users WHERE email LIKE $1`, [`%@${TEST_DOMAIN}`]);
}

beforeAll(async () => {
  await cleanUp();
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name) VALUES ($1, 'not-a-real-hash', 'AI failure test') RETURNING id`,
    [`user-${crypto.randomUUID()}@${TEST_DOMAIN}`],
  );
  userId = result.rows[0].id;
});
afterAll(cleanUp);

async function caseWithLetter(cookie: string): Promise<string> {
  const res = await request(app)
    .post("/api/cases")
    .set("Cookie", cookie)
    .send({ reference: `DMS-${crypto.randomUUID().slice(0, 8)}`, letterText: DMS_0042.letterText });
  expect(res.status).toBe(201);
  return caseResponseSchema.parse(res.body).case.id;
}

describe("POST /api/cases/:id/extract when the live reader fails", () => {
  it("bad answers: 503 asking for the medicines by hand, and nothing saved", async () => {
    const cookie = `${SESSION_COOKIE}=${signSessionToken({ id: userId, role: "pharmacist" })}`;
    const caseId = await caseWithLetter(cookie);
    fake.parse.mockResolvedValue(BAD_ANSWER);

    const res = await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookie);
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "We couldn't read this letter automatically. Add the medicines by hand." });

    const saved = await getPool().query(`SELECT 1 FROM medicines WHERE case_id = $1`, [caseId]);
    expect(saved.rowCount).toBe(0);
  });

  it("timeout: 503 saying the reader isn't available, try again or add by hand", async () => {
    const cookie = `${SESSION_COOKIE}=${signSessionToken({ id: userId, role: "pharmacist" })}`;
    const caseId = await caseWithLetter(cookie);
    fake.parse.mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" }));

    const res = await request(app).post(`/api/cases/${caseId}/extract`).set("Cookie", cookie);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/isn't available right now.*add the medicines by hand/);
  });
});
