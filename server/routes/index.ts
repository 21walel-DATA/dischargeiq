// All routes under /api. Each feature adds its own router here.
import { Router } from "express";
import { healthRouter } from "./health.routes";
import { createAuthRouter } from "./auth.routes";
import { createCasesRouter } from "./cases.routes";

export function createApiRouter(): Router {
  const apiRouter = Router();
  apiRouter.use(healthRouter);
  apiRouter.use(createAuthRouter());
  apiRouter.use(createCasesRouter());
  return apiRouter;
}
