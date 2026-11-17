// Claim-ready records and the claims & stats page (D-021, D-023, D-048). Own cases only (golden rule 12).
// No MYS submission: the pharmacist copies the fields into Manage Your Service by hand.
import { claimByDate, earliestPaymentDate, STAGE_FEES, type ClaimSummary, type Stats } from "@dischargeiq/shared";
import { getPool } from "../db/pool";
import { getCaseDetail } from "./case.service";
import { compareCase } from "./comparison.service";

type CaseRow = {
  id: string;
  reference: string;
  referralReceivedAt: string | null;
  hospitalName: string | null;
  claimStatus: ClaimSummary["claimStatus"];
  claimedAt: string | null;
};
type StageRow = ClaimSummary["stages"][number] & { caseId: string };

function summarise(row: CaseRow, stages: ClaimSummary["stages"]): ClaimSummary {
  const completed = stages.filter((s) => s.status === "completed");
  const value = completed.reduce((total, s) => total + (STAGE_FEES[s.stage] ?? 0), 0);
  // The most recent completion time. ISO date strings sort correctly as text, so ">" works.
  let lastStageCompletedAt: string | null = null;
  for (const s of completed) {
    if (s.completedAt && (lastStageCompletedAt === null || s.completedAt > lastStageCompletedAt)) {
      lastStageCompletedAt = s.completedAt;
    }
  }
  // The deadline only exists once every stage is done (ready or claimed).
  const done = row.claimStatus !== "not_ready" && lastStageCompletedAt !== null;
  return {
    caseId: row.id,
    reference: row.reference,
    referralReceivedAt: row.referralReceivedAt,
    hospitalName: row.hospitalName,
    stages,
    value,
    claimStatus: row.claimStatus,
    claimedAt: row.claimedAt,
    lastStageCompletedAt,
    claimBy: done && lastStageCompletedAt ? claimByDate(lastStageCompletedAt) : null,
    earliestPaymentBy: done && lastStageCompletedAt ? earliestPaymentDate(lastStageCompletedAt) : null,
  };
}

const CASE_COLUMNS = `c.id, c.reference, c.referral_received_at AS "referralReceivedAt", c.hospital_name AS "hospitalName",
  c.claim_status AS "claimStatus", c.claimed_at AS "claimedAt"`;
const STAGE_COLUMNS = `s.case_id AS "caseId", s.stage, s.status, s.completed_at AS "completedAt",
  s.not_applicable_reason AS "notApplicableReason"`;

// Every claim record for one user's own (non-demo) cases, newest first. Two queries, grouped here.
export async function listClaims(userId: string): Promise<ClaimSummary[]> {
  const pool = getPool();
  const cases = await pool.query<CaseRow>(
    `SELECT ${CASE_COLUMNS} FROM cases c WHERE c.user_id = $1 AND c.is_demo = false ORDER BY c.updated_at DESC`,
    [userId],
  );
  const stages = await pool.query<StageRow>(
    `SELECT ${STAGE_COLUMNS} FROM dms_stages s JOIN cases c ON c.id = s.case_id
     WHERE c.user_id = $1 AND c.is_demo = false ORDER BY s.stage`,
    [userId],
  );
  return cases.rows.map((row) =>
    summarise(
      row,
      stages.rows.filter((s) => s.caseId === row.id).map(({ caseId: _caseId, ...stage }) => stage),
    ),
  );
}

export async function getClaimSummary(caseId: string): Promise<ClaimSummary | null> {
  const pool = getPool();
  const cases = await pool.query<CaseRow>(`SELECT ${CASE_COLUMNS} FROM cases c WHERE c.id = $1`, [caseId]);
  const row = cases.rows[0];
  if (!row) return null;
  const stages = await pool.query<StageRow>(`SELECT ${STAGE_COLUMNS} FROM dms_stages s WHERE s.case_id = $1 ORDER BY s.stage`, [caseId]);
  return summarise(row, stages.rows.map(({ caseId: _caseId, ...stage }) => stage));
}

// Only a "ready" case can be marked as claimed; the WHERE clause makes that check and the change one step.
export async function markClaimed(caseId: string): Promise<boolean> {
  const result = await getPool().query(
    `UPDATE cases SET claim_status = 'claimed', claimed_at = now(), updated_at = now()
     WHERE id = $1 AND claim_status = 'ready'`,
    [caseId],
  );
  return (result.rowCount ?? 0) > 0;
}

// "What the comparisons found" and the money summary, across the user's own cases (owner decision D-048).
// Counts come from each case's current stage 1 comparison (cases whose letter has been read).
export async function getStats(userId: string): Promise<Stats> {
  const claims = await listClaims(userId);
  const lines = { unchanged: 0, changed: 0, started: 0, stopped: 0, neededReview: 0 };
  const highRisk = new Map<string, number>();

  for (const claim of claims) {
    const detail = await getCaseDetail(claim.caseId);
    if (!detail?.medicines.some((m) => m.listType === "discharge")) continue;
    for (const line of compareCase(detail, 1)) {
      lines[line.changeType] += 1;
      if (line.needsReview) lines.neededReview += 1;
      if (line.highRiskCategory) highRisk.set(line.highRiskCategory, (highRisk.get(line.highRiskCategory) ?? 0) + 1);
    }
  }

  const thisMonth = new Date().toISOString().slice(0, 7); // "2026-11"
  const ready = claims.filter((c) => c.claimStatus === "ready");
  const open = claims.filter((c) => c.claimStatus === "not_ready" && c.value > 0);
  const claimedThisMonth = claims.filter((c) => c.claimStatus === "claimed" && c.claimedAt?.startsWith(thisMonth));
  const total = (list: ClaimSummary[]): number => list.reduce((sum, c) => sum + c.value, 0);

  return {
    caseCount: claims.length,
    lines,
    highRisk: [...highRisk.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    money: {
      readyValue: total(ready),
      readyCount: ready.length,
      openCompletedValue: total(open),
      openCount: open.length,
      claimedThisMonthValue: total(claimedThisMonth),
      claimedThisMonthCount: claimedThisMonth.length,
    },
  };
}
