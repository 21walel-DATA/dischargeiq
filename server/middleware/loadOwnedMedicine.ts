// Golden rule 12 for medicine routes (/medicines/:id): the medicine must belong to one of YOUR cases.
// One query joins the medicine to its case and checks the case's owner; anything else is the same 404.
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getPool } from "../db/pool";
import { getCurrentUser } from "./requireAuth";

const NOT_FOUND = { error: "We couldn't find that medicine." };

export async function loadOwnedMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = getCurrentUser(res);
  const medicineId = req.params.id;
  if (!z.uuid().safeParse(medicineId).success) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const result = await getPool().query<{ id: string }>(
    `SELECT m.id FROM medicines m JOIN cases c ON c.id = m.case_id WHERE m.id = $1 AND c.user_id = $2`,
    [medicineId, user.id],
  );
  if (result.rows.length === 0) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.locals.medicineId = result.rows[0].id;
  next();
}

export function getOwnedMedicineId(res: Response): string {
  const medicineId: unknown = res.locals.medicineId;
  if (typeof medicineId !== "string") {
    throw new Error("getOwnedMedicineId() used on a route without loadOwnedMedicine");
  }
  return medicineId;
}
