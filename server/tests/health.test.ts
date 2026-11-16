import { describe, expect, it } from "vitest";
import request from "supertest";
import { healthResponseSchema } from "@dischargeiq/shared";
import { createApp } from "../app";

const app = createApp();

describe("GET /api/health", () => {
  it("reports the API and database as ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    // The answer must match the shared schema the client uses.
    expect(healthResponseSchema.parse(res.body)).toEqual({ status: "ok", database: "ok" });
  });

  it("sends security headers and hides the framework", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
