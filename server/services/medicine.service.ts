// Medicines (the brief's "things") on a case's three lists. Ownership is checked before these run
// (loadOwnedCase / loadOwnedMedicine), so they take already-checked ids.
import type { ExtractedMedicine, Medicine, MedicineCreate, MedicineUpdate } from "@dischargeiq/shared";
import { getPool } from "../db/pool";
import { MEDICINE_COLUMNS, touchCase } from "./case.service";

export async function addMedicine(caseId: string, input: MedicineCreate): Promise<Medicine> {
  const result = await getPool().query<Medicine>(
    `INSERT INTO medicines (case_id, list_type, name, strength, form, dose, frequency, route)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${MEDICINE_COLUMNS}`,
    [caseId, input.listType, input.name, input.strength ?? null, input.form ?? null, input.dose ?? null, input.frequency ?? null, input.route ?? null],
  );
  await touchCase(caseId);
  return result.rows[0];
}

// Editing gives the medicine a NEW id (insert a copy, delete the old one). That is deliberate: the comparison's line
// keys are built from medicine ids (D-032), so an edited line must be acknowledged again by the pharmacist.
export async function updateMedicine(medicineId: string, input: MedicineUpdate): Promise<Medicine | null> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const old = await client.query<Medicine>(`SELECT ${MEDICINE_COLUMNS} FROM medicines WHERE id = $1`, [medicineId]);
    const current = old.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }
    // A field that wasn't sent keeps its old value; one sent as empty becomes null.
    const pick = (field: keyof MedicineUpdate): string | null =>
      input[field] === undefined ? current[field] : (input[field] ?? null);
    const inserted = await client.query<Medicine>(
      `INSERT INTO medicines (case_id, list_type, name, strength, form, dose, frequency, route,
                              source_text, letter_status, ai_confidence, edited_by_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
       RETURNING ${MEDICINE_COLUMNS}`,
      [
        current.caseId, current.listType, input.name ?? current.name, pick("strength"), pick("form"), pick("dose"),
        pick("frequency"), pick("route"), current.sourceText, current.letterStatus, current.aiConfidence,
      ],
    );
    await client.query(`DELETE FROM medicines WHERE id = $1`, [medicineId]);
    await client.query("COMMIT");
    await touchCase(current.caseId);
    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMedicine(medicineId: string): Promise<void> {
  const result = await getPool().query<{ caseId: string }>(`DELETE FROM medicines WHERE id = $1 RETURNING case_id AS "caseId"`, [
    medicineId,
  ]);
  if (result.rows[0]) {
    await touchCase(result.rows[0].caseId);
  }
}

// Replaces the case's discharge list with a fresh AI extraction, in one transaction (all or nothing).
export async function replaceDischargeList(caseId: string, extracted: ExtractedMedicine[]): Promise<Medicine[]> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM medicines WHERE case_id = $1 AND list_type = 'discharge'`, [caseId]);
    const saved: Medicine[] = [];
    for (const m of extracted) {
      const result = await client.query<Medicine>(
        `INSERT INTO medicines (case_id, list_type, name, strength, form, dose, frequency, route,
                                source_text, letter_status, ai_confidence)
         VALUES ($1, 'discharge', $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${MEDICINE_COLUMNS}`,
        [
          caseId, m.name, m.strength ?? null, m.form ?? null, m.dose ?? null, m.frequency ?? null, m.route ?? null,
          m.source_text, m.status_in_letter ?? null, Math.round(m.confidence * 100) / 100,
        ],
      );
      saved.push(result.rows[0]);
    }
    await client.query("COMMIT");
    await touchCase(caseId);
    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
