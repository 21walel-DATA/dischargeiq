import { Router } from "express";
import {
  addMyMedicine,
  copyDemo,
  createMyCase,
  deleteMyCase,
  deleteMyMedicine,
  extractFromLetter,
  getAiStatus,
  getCase,
  getReconciliation,
  listDemo,
  listMyCases,
  updateMyCase,
  updateMyMedicine,
} from "../controllers/cases.controller";
import { requireAuth } from "../middleware/requireAuth";
import { loadOwnedCase } from "../middleware/loadOwnedCase";
import { loadOwnedMedicine } from "../middleware/loadOwnedMedicine";
import { loadDemoCase } from "../middleware/loadDemoCase";
import { createExtractLimiter } from "../middleware/rateLimit";

// Golden rule 12: every route with a case or medicine id passes through requireAuth THEN an ownership check.
export function createCasesRouter(): Router {
  const router = Router();

  // Your own cases (logged in).
  router.get("/cases", requireAuth, listMyCases);
  router.post("/cases", requireAuth, createMyCase);
  router.get("/cases/:id", requireAuth, loadOwnedCase, getCase);
  router.patch("/cases/:id", requireAuth, loadOwnedCase, updateMyCase);
  router.delete("/cases/:id", requireAuth, loadOwnedCase, deleteMyCase);
  router.post("/cases/:id/medicines", requireAuth, loadOwnedCase, addMyMedicine);
  router.post("/cases/:id/extract", requireAuth, createExtractLimiter(), loadOwnedCase, extractFromLetter);
  router.get("/cases/:id/reconciliation", requireAuth, loadOwnedCase, getReconciliation);

  router.patch("/medicines/:id", requireAuth, loadOwnedMedicine, updateMyMedicine);
  router.delete("/medicines/:id", requireAuth, loadOwnedMedicine, deleteMyMedicine);

  // Public, read-only demo cases (synthetic data only). Copying one needs a login.
  router.get("/demo-cases", listDemo);
  router.get("/demo-cases/:id", loadDemoCase, getCase);
  router.get("/demo-cases/:id/reconciliation", loadDemoCase, getReconciliation);
  router.post("/demo-cases/:id/copy", requireAuth, loadDemoCase, copyDemo);

  // Tells the app whether letters are read by Claude or by the built-in sample (shows the "Demo mode" label).
  router.get("/ai/status", getAiStatus);

  return router;
}
