// Auth: register, login, logout, /me, the cookie's safety flags, rate limiting and roles.
// Runs against the TEST database only (see setup.ts). Every test user has an email on our own test domain,
// so the clean-up below can never delete anything else.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import jwt from "jsonwebtoken";
import { authResponseSchema } from "@dischargeiq/shared";
import { createApp } from "../app";
import { getPool } from "../db/pool";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { errorHandler } from "../middleware/errorHandler";
import { SESSION_COOKIE, signSessionToken } from "../services/session.service";

const TEST_DOMAIN = "auth-test.example.com";
const PASSWORD = "correct horse battery";

function newEmail(): string {
  return `user-${crypto.randomUUID()}@${TEST_DOMAIN}`;
}

// The Set-Cookie header for our session cookie, or "" if there isn't one.
function sessionSetCookie(res: request.Response): string {
  const header = res.headers["set-cookie"];
  const cookies: string[] = Array.isArray(header) ? header : header ? [header] : [];
  return cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`)) ?? "";
}

// Just "diq_session=<token>", ready to send back in a Cookie header.
function cookiePair(res: request.Response): string {
  return sessionSetCookie(res).split(";")[0];
}

async function registerNewUser(app: express.Express, email = newEmail()): Promise<request.Response> {
  return request(app).post("/api/auth/register").send({ email, displayName: "Test Pharmacist", password: PASSWORD });
}

async function deleteTestUsers(): Promise<void> {
  await getPool().query(`DELETE FROM users WHERE email LIKE $1`, [`%@${TEST_DOMAIN}`]);
}

beforeAll(deleteTestUsers);
afterAll(deleteTestUsers);

describe("POST /api/auth/register", () => {
  it("creates a pharmacist, logs them in and never returns the password hash", async () => {
    const email = newEmail();
    const res = await registerNewUser(createApp(), email);

    expect(res.status).toBe(201);
    const body = authResponseSchema.parse(res.body);
    expect(body.user).toMatchObject({ email, displayName: "Test Pharmacist", role: "pharmacist" });
    expect(res.text).not.toContain("password");
    expect(sessionSetCookie(res)).not.toBe("");
  });

  it("stores a bcrypt hash, not the password", async () => {
    const email = newEmail();
    await registerNewUser(createApp(), email);
    const row = await getPool().query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE email = $1`,
      [email],
    );
    expect(row.rows[0].password_hash).not.toBe(PASSWORD);
    expect(row.rows[0].password_hash).toMatch(/^\$2[aby]\$10\$/); // bcrypt, cost 10
  });

  it("sets the cookie as HttpOnly, Secure and SameSite=Lax", async () => {
    const cookie = sessionSetCookie(await registerNewUser(createApp()));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
  });

  it("ignores a role sent from the browser", async () => {
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ email: newEmail(), displayName: "Sneaky", password: PASSWORD, role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("pharmacist");
  });

  it("refuses a short password with a message for that field", async () => {
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ email: newEmail(), displayName: "Test", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toBe("Use at least 12 characters for your password.");
    expect(sessionSetCookie(res)).toBe("");
  });

  it("refuses an email that is already registered, ignoring capital letters", async () => {
    const app = createApp();
    const email = newEmail();
    await registerNewUser(app, email);
    const res = await registerNewUser(app, email.toUpperCase());
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the right password (email in any case) and sets the cookie", async () => {
    const app = createApp();
    const email = newEmail();
    await registerNewUser(app, email);

    const res = await request(app).post("/api/auth/login").send({ email: `  ${email.toUpperCase()} `, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(authResponseSchema.parse(res.body).user.email).toBe(email);
    expect(sessionSetCookie(res)).toMatch(/HttpOnly/i);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const app = createApp();
    const email = newEmail();
    await registerNewUser(app, email);

    const wrongPassword = await request(app).post("/api/auth/login").send({ email, password: "not the password" });
    const unknownEmail = await request(app).post("/api/auth/login").send({ email: newEmail(), password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(sessionSetCookie(wrongPassword)).toBe("");
  });

  it("blocks an address after 10 failed attempts", async () => {
    const app = createApp(); // fresh app = fresh counters
    const attempt = { email: newEmail(), password: "wrong password" };
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post("/api/auth/login").send(attempt);
      expect(res.status).toBe(401);
    }
    const blocked = await request(app).post("/api/auth/login").send(attempt);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/Too many attempts/);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the logged-in user when the cookie is sent", async () => {
    const app = createApp();
    const email = newEmail();
    const registered = await registerNewUser(app, email);

    const res = await request(app).get("/api/auth/me").set("Cookie", cookiePair(registered));
    expect(res.status).toBe(200);
    expect(authResponseSchema.parse(res.body).user.email).toBe(email);
  });

  it("returns 401 without a cookie", async () => {
    const res = await request(createApp()).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Log in to continue." });
  });

  it("returns 401 for a token that has been edited", async () => {
    const registered = await registerNewUser(createApp());
    const [header, , signature] = cookiePair(registered).split("=")[1].split(".");
    // Swap in a payload claiming to be an admin, keeping the old signature.
    const fakePayload = Buffer.from(JSON.stringify({ sub: crypto.randomUUID(), role: "admin" })).toString("base64url");
    const res = await request(createApp())
      .get("/api/auth/me")
      .set("Cookie", `${SESSION_COOKIE}=${header}.${fakePayload}.${signature}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a token signed with a different secret", async () => {
    const forged = jwt.sign({ role: "admin" }, "a-different-secret-that-is-long-enough-123", {
      subject: crypto.randomUUID(),
    });
    const res = await request(createApp()).get("/api/auth/me").set("Cookie", `${SESSION_COOKIE}=${forged}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an unsigned "alg: none" token', async () => {
    const unsigned = jwt.sign({ role: "admin" }, "", { algorithm: "none", subject: crypto.randomUUID() });
    const res = await request(createApp()).get("/api/auth/me").set("Cookie", `${SESSION_COOKIE}=${unsigned}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for an expired token", async () => {
    const secret = process.env.JWT_SECRET ?? "";
    const expired = jwt.sign({ role: "pharmacist", exp: Math.floor(Date.now() / 1000) - 60 }, secret, {
      subject: crypto.randomUUID(),
    });
    const res = await request(createApp()).get("/api/auth/me").set("Cookie", `${SESSION_COOKIE}=${expired}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a valid token whose account no longer exists", async () => {
    const token = signSessionToken({ id: crypto.randomUUID(), role: "pharmacist" });
    const res = await request(createApp()).get("/api/auth/me").set("Cookie", `${SESSION_COOKIE}=${token}`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("tells the browser to delete the cookie", async () => {
    const res = await request(createApp()).post("/api/auth/logout");
    expect(res.status).toBe(204);
    const cookie = sessionSetCookie(res);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});

describe("requireRole", () => {
  // A tiny app with one admin-only route, using the real middleware.
  const app = express();
  app.use(cookieParser());
  app.get("/admin-only", requireAuth, requireRole("admin"), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);

  it("lets an admin through", async () => {
    const token = signSessionToken({ id: crypto.randomUUID(), role: "admin" });
    const res = await request(app).get("/admin-only").set("Cookie", `${SESSION_COOKIE}=${token}`);
    expect(res.status).toBe(200);
  });

  it("stops a pharmacist with 403", async () => {
    const token = signSessionToken({ id: crypto.randomUUID(), role: "pharmacist" });
    const res = await request(app).get("/admin-only").set("Cookie", `${SESSION_COOKIE}=${token}`);
    expect(res.status).toBe(403);
  });

  it("stops someone not logged in with 401", async () => {
    const res = await request(app).get("/admin-only");
    expect(res.status).toBe(401);
  });
});
