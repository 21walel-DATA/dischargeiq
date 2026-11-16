import { Router } from "express";
import { getHealth } from "../controllers/health.controller";

export const healthRouter = Router();

// GET /api/health: used by Render's health check and the uptime ping.
healthRouter.get("/health", getHealth);
