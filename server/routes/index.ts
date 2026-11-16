// All routes under /api. Each feature adds its own router here.
import { Router } from "express";
import { healthRouter } from "./health.routes";

export const apiRouter = Router();

apiRouter.use(healthRouter);
