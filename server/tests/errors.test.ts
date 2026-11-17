// Golden rule 13: errors show no details to users.
import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createApp } from "../app";
import { errorHandler } from "../middleware/errorHandler";
import { errorCode } from "../services/logSafe";

describe("error handling", () => {
  it("returns a friendly 404 for an unknown route", async () => {
    const res = await request(createApp()).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "We couldn't find that. Check the address and try again." });
  });

  it("returns a friendly 400 for broken JSON, without parser details", async () => {
    const res = await request(createApp())
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/Unexpected|SyntaxError|position/i);
  });

  it("hides the message and stack trace of an unexpected error", async () => {
    // A tiny app with a route that throws, using the real error handler.
    const app = express();
    app.get("/boom", () => {
      throw new Error("secret internal detail: SELECT * FROM users");
    });
    app.use(errorHandler);

    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Something went wrong on our side. Try again in a moment." });
    expect(res.text).not.toContain("secret internal detail");
    expect(res.text).not.toContain("at ");
  });
});

// The server LOG must not get request values either (logSafe.ts): a broken login body could hold a password, and a
// database error's detail can quote an email.
describe("what errors write to the server log", () => {
  function captureLog(): { lines: string[]; restore: () => void } {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      lines.push(args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : String(a))).join(" "));
    });
    return { lines, restore: () => spy.mockRestore() };
  }

  it("a broken JSON body is logged by type only, never its contents", async () => {
    const log = captureLog();
    await request(createApp())
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":"a@example.com","password":"correct-horse-battery-staple"');
    log.restore();
    expect(log.lines.join("\n")).toContain("entity.parse.failed");
    expect(log.lines.join("\n")).not.toContain("correct-horse-battery-staple");
  });

  it("an unexpected error is logged by name and code, without its message or detail", async () => {
    const app = express();
    app.get("/boom", () => {
      throw Object.assign(new Error("duplicate key: user@example.com"), { code: "23505", detail: "Key (email)=(user@example.com)" });
    });
    app.use(errorHandler);
    const log = captureLog();
    await request(app).get("/boom");
    log.restore();
    expect(log.lines.join("\n")).toContain("Error / 23505");
    expect(log.lines.join("\n")).not.toContain("user@example.com");
  });

  it("errorCode never includes the message", () => {
    expect(errorCode(Object.assign(new Error("postgres://user:pw@host"), { code: "ECONNREFUSED" }))).toBe("Error / ECONNREFUSED");
    expect(errorCode("just a string")).toBe("unknown");
  });
});
