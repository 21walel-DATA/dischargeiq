// All routes under /api. Each feature adds its own router here.
import { Router } from "express";
import { healthRouter } from "./health.routes";
import { createAuthRouter } from "./auth.routes";

export function createApiRouter(): Router {
  const apiRouter = Router();
  apiRouter.use(healthRouter);
  apiRouter.use(createAuthRouter());
  return apiRouter;
}
