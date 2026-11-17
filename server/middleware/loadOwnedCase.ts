// Golden rule 12: users can only see and change their own cases.
// Every route with a case id in its address uses this AFTER requireAuth, e.g.
//   router.get("/cases/:id", requireAuth, loadOwnedCase, getCase)
// It looks the case up WITH the user's id in the same query, so another user's case is simply "not found".
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getPool } from "../db/pool";
import { getCurrentUser } from "./requireAuth";

const NOT_FOUND = { error: "We couldn't find that case." };

// We answer 404 (not 403) for someone else's case on purpose: 403 would confirm that the case exists.
export async function loadOwnedCase(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = getCurrentUser(res);
  const caseId = req.params.id;

  // A badly formed id can't be anyone's case. Checking first also stops Postgres raising an "invalid uuid" error.
  if (!z.uuid().safeParse(caseId).success) {
    res.status(404).json(NOT_FOUND);
    return;
  }

  const result = await getPool().query<{ id: string }>(
    `SELECT id FROM cases WHERE id = $1 AND user_id = $2`,
    [caseId, user.id],
  );
  if (result.rows.length === 0) {
    res.status(404).json(NOT_FOUND);
    return;
  }

  res.locals.caseId = result.rows[0].id;
  next();
}

// The case id that loadOwnedCase checked. Controllers use this instead of req.params.id.
export function getOwnedCaseId(res: Response): string {
  const caseId: unknown = res.locals.caseId;
  if (typeof caseId !== "string") {
    throw new Error("getOwnedCaseId() used on a route without loadOwnedCase");
  }
  return caseId;
}
