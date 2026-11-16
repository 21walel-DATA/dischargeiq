import type { Request, Response } from "express";
import type { HealthResponse } from "@dischargeiq/shared";
import { isDatabaseReachable } from "../services/health.service";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const databaseOk = await isDatabaseReachable();
  const body: HealthResponse = databaseOk
    ? { status: "ok", database: "ok" }
    : { status: "degraded", database: "unavailable" };
  // 503 tells Render and the uptime monitor something is wrong, without revealing what.
  res.status(databaseOk ? 200 : 503).json(body);
}
