// Public, read-only demo cases (/demo-cases/:id). Only cases marked is_demo can be reached this way, so a real
// user's case can never be opened through a demo address. Sets the same res.locals.caseId as loadOwnedCase, so the
// read-only case controllers work for both.
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getPool } from "../db/pool";

const NOT_FOUND = { error: "We couldn't find that demo case." };

export async function loadDemoCase(req: Request, res: Response, next: NextFunction): Promise<void> {
  const caseId = req.params.id;
  if (!z.uuid().safeParse(caseId).success) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const result = await getPool().query<{ id: string }>(`SELECT id FROM cases WHERE id = $1 AND is_demo = true`, [caseId]);
  if (result.rows.length === 0) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.locals.caseId = result.rows[0].id;
  next();
}
