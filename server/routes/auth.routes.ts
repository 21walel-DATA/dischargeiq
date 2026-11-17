import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/requireAuth";
import { createLoginLimiter, createRegisterLimiter } from "../middleware/rateLimit";

// A function (not a shared object) so each app, including each test app, gets its own rate-limit counters.
export function createAuthRouter(): Router {
  const router = Router();
  router.post("/auth/register", createRegisterLimiter(), register);
  router.post("/auth/login", createLoginLimiter(), login);
  router.post("/auth/logout", logout);
  router.get("/auth/me", requireAuth, me);
  return router;
}
