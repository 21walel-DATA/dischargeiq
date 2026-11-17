// Cases (the brief's "collections"): create, read, update, delete, plus the public demo cases.
// Ownership is checked BEFORE these functions run (loadOwnedCase, D-043), so they take an already-checked case id.
// Every query is parameterised ($1, $2…): values never become part of the SQL text.
import { initials, type CaseCreate, type CaseDetail, type CaseSummary, type CaseUpdate, type DmsStage, type Medicine } from "@dischargeiq/shared";
import { getPool } from "../db/pool";

// `AS "camelCase"` renames each column so the rows already match the shared types.
const CASE_COLUMNS = `
  c.id, c.reference, c.hospital_name AS "hospitalName", c.referral_received_at AS "referralReceivedAt",
  c.status, c.claim_status AS "claimStatus", c.is_demo AS "isDemo",
  c.created_at AS "createdAt", c.updated_at AS "updatedAt"`;

export const MEDICINE_COLUMNS = `
  id, case_id AS "caseId", list_type AS "listType", name, strength, form, dose, frequency, route,
  source_text AS "sourceText", letter_status AS "letterStatus", ai_confidence AS "aiConfidence",
  edited_by_user AS "editedByUser"`;

// One row per case, with its three stage statuses gathered into a small JSON list.
const SUMMARY_QUERY = `
  SELECT ${CASE_COLUMNS},
    COALESCE(
      (SELECT json_agg(json_build_object('stage', s.stage, 'status', s.status) ORDER BY s.stage)
       FROM dms_stages s WHERE s.case_id = c.id),
      '[]'
    ) AS stages
  FROM cases c`;

export async function listCases(userId: string): Promise<CaseSummary[]> {
  const result = await getPool().query<CaseSummary>(
    `${SUMMARY_QUERY} WHERE c.user_id = $1 AND c.is_demo = false ORDER BY c.updated_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function listDemoCases(): Promise<CaseSummary[]> {
  const result = await getPool().query<CaseSummary>(`${SUMMARY_QUERY} WHERE c.is_demo = true ORDER BY c.reference`);
  return result.rows;
}

export async function getCaseDetail(caseId: string): Promise<CaseDetail | null> {
  const pool = getPool();
  const caseResult = await pool.query<CaseSummary & { letterText: string | null }>(
    `SELECT ${CASE_COLUMNS}, c.letter_text AS "letterText", '[]'::json AS stages FROM cases c WHERE c.id = $1`,
    [caseId],
  );
  const row = caseResult.rows[0];
  if (!row) {
    return null;
  }
  const medicines = await pool.query<Medicine>(
    `SELECT ${MEDICINE_COLUMNS} FROM medicines WHERE case_id = $1 ORDER BY list_type, created_at, name`,
    [caseId],
  );
  return { ...row, medicines: medicines.rows, stages: await getStages(caseId) };
}

// The result of creating a case: its id, or "referenceTaken" (the same user already used that reference).
export type CreateCaseResult = { ok: true; id: string } | { ok: false; reason: "referenceTaken" };

// Creates the case AND its three DMS stage rows in one transaction: either all four rows exist, or none (D-021).
export async function createCase(userId: string, input: CaseCreate, isDemo = false): Promise<CreateCaseResult> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO cases (user_id, reference, hospital_name, referral_received_at, letter_text, is_demo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, input.reference, input.hospitalName ?? null, input.referralReceivedAt ?? null, input.letterText ?? null, isDemo],
    );
    const caseId = inserted.rows[0].id;
    await client.query(`INSERT INTO dms_stages (case_id, stage) VALUES ($1, 1), ($1, 2), ($1, 3)`, [caseId]);
    await client.query("COMMIT");
    return { ok: true, id: caseId };
  } catch (error) {
    await client.query("ROLLBACK");
    // 23505 = unique violation on (user_id, reference).
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { ok: false, reason: "referenceTaken" };
    }
    throw error;
  } finally {
    client.release(); // always give the connection back to the pool
  }
}

export type UpdateCaseResult = { ok: true } | { ok: false; reason: "referenceTaken" };

// Only the fields that were sent are changed. Each column name comes from this fixed list, never from the request.
export async function updateCase(caseId: string, input: CaseUpdate): Promise<UpdateCaseResult> {
  const columns: Record<keyof CaseUpdate, string> = {
    reference: "reference",
    hospitalName: "hospital_name",
    referralReceivedAt: "referral_received_at",
    letterText: "letter_text",
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const field of Object.keys(columns) as (keyof CaseUpdate)[]) {
    if (input[field] !== undefined) {
      values.push(input[field]);
      sets.push(`${columns[field]} = $${values.length}`);
    }
  }
  values.push(caseId);
  try {
    await getPool().query(
      `UPDATE cases SET ${[...sets, "updated_at = now()"].join(", ")} WHERE id = $${values.length}`,
      values,
    );
    return { ok: true };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { ok: false, reason: "referenceTaken" };
    }
    throw error;
  }
}

export async function deleteCase(caseId: string): Promise<void> {
  // Its stages and medicines go too (ON DELETE CASCADE in 001_init.sql).
  await getPool().query(`DELETE FROM cases WHERE id = $1`, [caseId]);
}

// Marks the case as changed (used when its medicines change), so "My cases" lists it first.
export async function touchCase(caseId: string): Promise<void> {
  await getPool().query(`UPDATE cases SET updated_at = now(), status = CASE WHEN status = 'draft' THEN 'in_progress' ELSE status END WHERE id = $1`, [caseId]);
}

// Copies a demo case into the user's own cases: the letter and the pre-admission list only, so the user runs the
// AI extraction and the comparison themselves (the demo journey).
export async function copyDemoCase(demoCaseId: string, userId: string): Promise<string | null> {
  const demo = await getCaseDetail(demoCaseId);
  if (!demo || !demo.isDemo) {
    return null;
  }
  // Find a free reference: "DMS-0042 (copy)", then "(copy 2)", "(copy 3)"…
  for (let attempt = 1; attempt <= 50; attempt++) {
    const reference = attempt === 1 ? `${demo.reference} (copy)` : `${demo.reference} (copy ${attempt})`;
    const created = await createCase(userId, {
      reference,
      hospitalName: demo.hospitalName,
      referralReceivedAt: new Date().toISOString(),
      letterText: demo.letterText,
    });
    if (created.ok) {
      const pool = getPool();
      for (const medicine of demo.medicines.filter((m) => m.listType === "pre_admission")) {
        await pool.query(
          `INSERT INTO medicines (case_id, list_type, name, strength, form, dose, frequency, route)
           VALUES ($1, 'pre_admission', $2, $3, $4, $5, $6, $7)`,
          [created.id, medicine.name, medicine.strength, medicine.form, medicine.dose, medicine.frequency, medicine.route],
        );
      }
      return created.id;
    }
  }
  return null;
}

// The three stages with who completed them and who checked each "Needs review" line (D-048).
export async function getStages(caseId: string): Promise<DmsStage[]> {
  const pool = getPool();
  type StageRow = Omit<DmsStage, "completedByInitials" | "acknowledgements"> & { completedByName: string | null };
  const stages = await pool.query<StageRow>(
    `SELECT s.stage, s.status, s.not_applicable_reason AS "notApplicableReason", s.completed_at AS "completedAt",
            s.notes, u.display_name AS "completedByName"
     FROM dms_stages s LEFT JOIN users u ON u.id = s.completed_by
     WHERE s.case_id = $1 ORDER BY s.stage`,
    [caseId],
  );
  const acks = await pool.query<{ stage: number; key: string; byName: string; at: string; note: string | null }>(
    `SELECT a.stage, a.review_key AS key, u.display_name AS "byName", a.acknowledged_at AS at, a.note
     FROM review_acknowledgements a JOIN users u ON u.id = a.acknowledged_by
     WHERE a.case_id = $1 ORDER BY a.acknowledged_at`,
    [caseId],
  );
  return stages.rows.map(({ completedByName, ...stage }) => ({
    ...stage,
    completedByInitials: completedByName ? initials(completedByName) : null,
    acknowledgements: acks.rows
      .filter((a) => a.stage === stage.stage)
      .map((a) => ({ key: a.key, byInitials: initials(a.byName), byName: a.byName, at: a.at, note: a.note })),
  }));
}
