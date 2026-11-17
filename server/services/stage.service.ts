// The DMS stage tracker (D-021, D-032, D-048): autosaved notes, "Checked by" acknowledgements, "not applicable",
// and completing a stage. The approval gate is enforced HERE, on the server: a page bug can't skip it.
import type { ReconciliationLine, StageUpdate } from "@dischargeiq/shared";
import { getPool } from "../db/pool";
import { getCaseDetail } from "./case.service";
import { compareCase } from "./comparison.service";

// What every stage action gives back: ok, or an HTTP status and a message the pharmacist can act on.
export type StageResult = { ok: true } | { ok: false; status: 400 | 409; message: string; unresolved?: number };

const CLAIMED = "This case has been claimed, so its stages can't be changed.";

async function isClaimed(caseId: string): Promise<boolean> {
  const result = await getPool().query<{ claimStatus: string }>(`SELECT claim_status AS "claimStatus" FROM cases WHERE id = $1`, [caseId]);
  return result.rows[0]?.claimStatus === "claimed";
}

async function stageStatus(caseId: string, stage: number): Promise<string | null> {
  const result = await getPool().query<{ status: string }>(`SELECT status FROM dms_stages WHERE case_id = $1 AND stage = $2`, [caseId, stage]);
  return result.rows[0]?.status ?? null;
}

// The current comparison for stage 1 or 2, with the keys the pharmacist has already acknowledged.
async function linesAndAcks(caseId: string, stage: 1 | 2): Promise<{ lines: ReconciliationLine[]; acked: Map<string, { by: string; at: string; note: string | null }> }> {
  const detail = await getCaseDetail(caseId);
  const lines = detail ? compareCase(detail, stage) : [];
  const result = await getPool().query<{ key: string; by: string; at: string; note: string | null }>(
    `SELECT review_key AS key, acknowledged_by AS by, acknowledged_at AS at, note
     FROM review_acknowledgements WHERE case_id = $1 AND stage = $2`,
    [caseId, stage],
  );
  return { lines, acked: new Map(result.rows.map((row) => [row.key, row])) };
}

// Flagged lines nobody has acknowledged yet. Acknowledgements for lines that no longer exist (e.g. after a medicine
// was edited, which gives it a new key) simply don't match anything, so the new line must be checked again.
export function unresolvedLines(lines: ReconciliationLine[], ackedKeys: Set<string>): ReconciliationLine[] {
  return lines.filter((line) => line.needsReview && !ackedKeys.has(line.key));
}

// Recalculates the claim and case status after any stage change (D-021):
// claim ready = no stage pending AND stage 1 completed; case complete = no stage pending.
async function recalculate(caseId: string): Promise<void> {
  await getPool().query(
    `UPDATE cases c SET
       claim_status = CASE
         WHEN c.claim_status = 'claimed' THEN 'claimed'
         WHEN NOT EXISTS (SELECT 1 FROM dms_stages s WHERE s.case_id = c.id AND s.status = 'pending')
          AND EXISTS (SELECT 1 FROM dms_stages s WHERE s.case_id = c.id AND s.stage = 1 AND s.status = 'completed')
         THEN 'ready' ELSE 'not_ready' END,
       status = CASE
         WHEN NOT EXISTS (SELECT 1 FROM dms_stages s WHERE s.case_id = c.id AND s.status = 'pending') THEN 'complete'
         ELSE 'in_progress' END,
       updated_at = now()
     WHERE c.id = $1`,
    [caseId],
  );
}

export async function updateStage(caseId: string, stage: number, userId: string, input: StageUpdate): Promise<StageResult> {
  if (await isClaimed(caseId)) return { ok: false, status: 409, message: CLAIMED };
  const pool = getPool();
  const current = await stageStatus(caseId, stage);

  if (input.notes !== undefined) {
    await pool.query(`UPDATE dms_stages SET notes = $1, updated_at = now() WHERE case_id = $2 AND stage = $3`, [
      input.notes === "" ? null : input.notes,
      caseId,
      stage,
    ]);
  }

  if (input.acknowledge || input.unacknowledge) {
    if (stage === 3) return { ok: false, status: 400, message: "Stage 3 has no comparison lines to check." };
    if (current === "completed") return { ok: false, status: 409, message: "Reopen the stage to change what was checked." };
    if (input.acknowledge) {
      // Only a line that is in the comparison right now AND needs review can be acknowledged.
      const { lines } = await linesAndAcks(caseId, stage === 2 ? 2 : 1);
      const line = lines.find((l) => l.key === input.acknowledge?.key);
      if (!line || !line.needsReview) {
        return { ok: false, status: 400, message: "That line doesn't need checking any more. Refresh the page." };
      }
      await pool.query(
        `INSERT INTO review_acknowledgements (case_id, stage, review_key, acknowledged_by, note)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (case_id, stage, review_key)
         DO UPDATE SET acknowledged_by = EXCLUDED.acknowledged_by, acknowledged_at = now(), note = EXCLUDED.note`,
        [caseId, stage, input.acknowledge.key, userId, input.acknowledge.note || null],
      );
    }
    if (input.unacknowledge) {
      await pool.query(`DELETE FROM review_acknowledgements WHERE case_id = $1 AND stage = $2 AND review_key = $3`, [
        caseId,
        stage,
        input.unacknowledge,
      ]);
    }
  }

  if (input.status === "not_applicable") {
    await pool.query(
      `UPDATE dms_stages SET status = 'not_applicable', not_applicable_reason = $1, completed_at = NULL, completed_by = NULL,
              updated_at = now() WHERE case_id = $2 AND stage = $3`,
      [input.notApplicableReason, caseId, stage],
    );
    await pool.query(`DELETE FROM reconciliation_items WHERE case_id = $1 AND stage = $2`, [caseId, stage]);
    await recalculate(caseId);
  } else if (input.status === "pending") {
    // Reopen: back to "not completed". The stored comparison is removed; it's stored again on the next completion.
    await pool.query(
      `UPDATE dms_stages SET status = 'pending', not_applicable_reason = NULL, completed_at = NULL, completed_by = NULL,
              updated_at = now() WHERE case_id = $1 AND stage = $2`,
      [caseId, stage],
    );
    await pool.query(`DELETE FROM reconciliation_items WHERE case_id = $1 AND stage = $2`, [caseId, stage]);
    await recalculate(caseId);
  } else {
    await pool.query(`UPDATE cases SET updated_at = now() WHERE id = $1`, [caseId]);
  }
  return { ok: true };
}

// Completes a stage. For stages 1 and 2 the comparison is run again here, and the stage is refused (409) while any
// flagged line is unacknowledged (D-032). The result is stored in reconciliation_items as the record of what was approved.
export async function completeStage(caseId: string, stage: number, userId: string): Promise<StageResult> {
  if (await isClaimed(caseId)) return { ok: false, status: 409, message: CLAIMED };
  if ((await stageStatus(caseId, stage)) === "completed") {
    return { ok: false, status: 409, message: `Stage ${stage} is already completed.` };
  }

  let lines: ReconciliationLine[] = [];
  let acked = new Map<string, { by: string; at: string; note: string | null }>();
  if (stage === 1 || stage === 2) {
    const detail = await getCaseDetail(caseId);
    const needed = stage === 1 ? "discharge" : "new_prescription";
    if (!detail?.medicines.some((m) => m.listType === needed)) {
      return {
        ok: false,
        status: 400,
        message:
          stage === 1
            ? "Read the letter or add the discharge medicines before completing stage 1."
            : "Add the first new prescription before completing stage 2, or mark stage 2 as not applicable.",
      };
    }
    ({ lines, acked } = await linesAndAcks(caseId, stage));
    const unresolved = unresolvedLines(lines, new Set(acked.keys()));
    if (unresolved.length > 0) {
      return {
        ok: false,
        status: 409,
        message: `${unresolved.length} ${unresolved.length === 1 ? "line still needs" : "lines still need"} checking before stage ${stage} can be completed.`,
        unresolved: unresolved.length,
      };
    }
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM reconciliation_items WHERE case_id = $1 AND stage = $2`, [caseId, stage]);
    for (const line of lines) {
      const ack = acked.get(line.key);
      await client.query(
        `INSERT INTO reconciliation_items (case_id, stage, from_medicine_id, to_medicine_id, change_type, change_detail,
           needs_review, review_reason, review_acknowledged_by, review_acknowledged_at, high_risk, pharmacist_note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          caseId, stage, line.from?.id ?? null, line.to?.id ?? null, line.changeType,
          [...line.changeDetails, line.timingNote].filter(Boolean).join("; ") || null,
          line.needsReview, line.reviewReasons.join(" | ") || null,
          ack?.by ?? null, ack?.at ?? null, line.highRisk, ack?.note ?? null,
        ],
      );
    }
    await client.query(
      `UPDATE dms_stages SET status = 'completed', completed_at = now(), completed_by = $1, not_applicable_reason = NULL,
              updated_at = now() WHERE case_id = $2 AND stage = $3`,
      [userId, caseId, stage],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await recalculate(caseId);
  return { ok: true };
}
