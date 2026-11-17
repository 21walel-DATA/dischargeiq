// Golden rule 12: a user can only reach their own cases. The real case routes arrive in Phase 2 and will all
// use loadOwnedCase; this proves the helper itself against the test database.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { getPool } from "../db/pool";
import { requireAuth } from "../middleware/requireAuth";
import { getOwnedCaseId, loadOwnedCase } from "../middleware/loadOwnedCase";
import { errorHandler } from "../middleware/errorHandler";
import { SESSION_COOKIE, signSessionToken } from "../services/session.service";

const TEST_DOMAIN = "ownership-test.example.com";

// A tiny app with one case route, protected exactly like the real ones will be.
const app = express();
app.use(cookieParser());
app.get("/cases/:id", requireAuth, loadOwnedCase, (_req, res) => {
  res.json({ caseId: getOwnedCaseId(res) });
});
app.use(errorHandler);

async function createUser(): Promise<string> {
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name) VALUES ($1, 'not-a-real-hash', 'Owner test')
     RETURNING id`,
    [`user-${crypto.randomUUID()}@${TEST_DOMAIN}`],
  );
  return result.rows[0].id;
}

async function createCase(userId: string): Promise<string> {
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO cases (user_id, reference) VALUES ($1, 'DMS-TEST-001') RETURNING id`,
    [userId],
  );
  return result.rows[0].id;
}

function cookieFor(userId: string): string {
  return `${SESSION_COOKIE}=${signSessionToken({ id: userId, role: "pharmacist" })}`;
}

async function deleteTestUsers(): Promise<void> {
  // Their cases go too (ON DELETE CASCADE).
  await getPool().query(`DELETE FROM users WHERE email LIKE $1`, [`%@${TEST_DOMAIN}`]);
}

let alice = "";
let bob = "";
let alicesCase = "";

beforeAll(async () => {
  await deleteTestUsers();
  alice = await createUser();
  bob = await createUser();
  alicesCase = await createCase(alice);
});
afterAll(deleteTestUsers);

describe("loadOwnedCase", () => {
  it("lets the owner open their case", async () => {
    const res = await request(app).get(`/cases/${alicesCase}`).set("Cookie", cookieFor(alice));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ caseId: alicesCase });
  });

  it("answers 404 (not 403) when another user asks for it, so its existence isn't revealed", async () => {
    const res = await request(app).get(`/cases/${alicesCase}`).set("Cookie", cookieFor(bob));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "We couldn't find that case." });
  });

  it("answers 404 for a case id that doesn't exist", async () => {
    const res = await request(app).get(`/cases/${crypto.randomUUID()}`).set("Cookie", cookieFor(alice));
    expect(res.status).toBe(404);
  });

  it("answers 404 (not a database error) for a malformed id", async () => {
    const res = await request(app).get(`/cases/not-a-uuid' OR '1'='1`).set("Cookie", cookieFor(alice));
    expect(res.status).toBe(404);
  });

  it("answers 401 when nobody is logged in", async () => {
    const res = await request(app).get(`/cases/${alicesCase}`);
    expect(res.status).toBe(401);
  });
});
