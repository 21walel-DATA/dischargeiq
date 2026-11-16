// Golden rule 13: errors show no details to users.
import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createApp } from "../app";
import { errorHandler } from "../middleware/errorHandler";

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
