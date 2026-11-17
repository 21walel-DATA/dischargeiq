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

describe("API documentation", () => {
  it("serves the OpenAPI file, with shapes generated from the shared schemas", async () => {
    const res = await request(app).get("/api/docs.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(Object.keys(res.body.paths)).toContain("/cases/{id}/stages/{stage}/complete");
    // The password rule in the docs comes straight from the Zod schema the server checks.
    expect(res.body.components.schemas.RegisterRequest.properties.password.minLength).toBe(12);
  });

  it("serves the Swagger page", async () => {
    // No trailing slash and no redirect: Vercel's /api rewrite doesn't forward "/api/docs/".
    const res = await request(app).get("/api/docs");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
    const assets = await request(app).get("/api/docs/assets/swagger-ui-bundle.js");
    expect(assets.status).toBe(200);
  });
});
