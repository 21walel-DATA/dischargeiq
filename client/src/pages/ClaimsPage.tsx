// Claims and stats (docs/designs/claims-desktop.png; D-021, D-023, D-048). Own cases only.
// No MYS submission (there is no public API): the pharmacist copies each field into Manage Your Service.
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { STAGE_FEES, type ClaimSummary, type Stats } from "@dischargeiq/shared";
import { getStats, listClaims, markClaimed } from "../api/stages";
import { STAGE_TITLES } from "../components/StageStrip";
import form from "../components/Form.module.css";
import page from "../components/Page.module.css";
import styles from "./ClaimsPage.module.css";

// "6 Nov 2026"
function longDate(iso: string | null): string {
  if (!iso) return "Not recorded";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function stagesDone(claim: ClaimSummary): string {
  const done = claim.stages.filter((s) => s.status === "completed").map((s) => s.stage);
  const na = claim.stages.filter((s) => s.status === "not_applicable").map((s) => s.stage);
  if (done.length === 0) return "None yet";
  const list = done.length === 1 ? String(done[0]) : `${done.slice(0, -1).join(", ")} and ${done[done.length - 1]}`;
  return na.length > 0 ? `${list} (${na.join(", ")} not applicable)` : list;
}

function statusWords(claim: ClaimSummary): string {
  if (claim.claimStatus === "claimed") return `Claimed ${longDate(claim.claimedAt)}`;
  if (claim.claimStatus === "ready") return "Ready to claim";
  const open = claim.stages.filter((s) => s.status === "pending").map((s) => s.stage);
  return open.length > 0 ? `Stage${open.length > 1 ? "s" : ""} ${open.join(" and ")} open` : "Stage 1 not completed";
}

function stageField(claim: ClaimSummary, stage: number): string {
  const s = claim.stages.find((x) => x.stage === stage);
  if (!s) return "Not recorded";
  if (s.status === "completed") return longDate(s.completedAt);
  if (s.status === "not_applicable") return `Not applicable: ${s.notApplicableReason ?? ""}`;
  return "Not completed";
}

// One field of the claim, with a Copy button (D-023).
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className={styles.copyRow}>
      <dt>{label}</dt>
      {/* The button sits INSIDE the <dd>: a <dl> group may only hold <dt> and <dd> (axe "definition-list"). */}
      <dd>
        <span className="num">{value}</span>
        <button className={`${form.buttonSecondary} ${form.buttonSmall}`} type="button" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? "Copied" : "Copy"}
        </button>
      </dd>
    </div>
  );
}

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className={styles.bar}>
      <span>{label}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${width}%` }} />
      </span>
      <span className={`num ${styles.count}`}>{count}</span>
    </div>
  );
}

export function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async (): Promise<void> => {
    const [claimResult, statsResult] = await Promise.all([listClaims(), getStats()]);
    if (claimResult.ok) setClaims(claimResult.claims);
    else setMessage(claimResult.message);
    if (statsResult.ok) setStats(statsResult.stats);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The case shown in the summary: from the address (?case=…), else the first one ready to claim.
  const selectedId = params.get("case") ?? claims?.find((c) => c.claimStatus === "ready")?.caseId ?? claims?.[0]?.caseId;
  const selected = claims?.find((c) => c.caseId === selectedId) ?? null;

  async function handleMarkClaimed(): Promise<void> {
    if (!selected) return;
    setBusy(true);
    const result = await markClaimed(selected.caseId);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    await load();
  }

  const month = new Date().toLocaleDateString("en-GB", { month: "long" });
  const lineMax = stats ? Math.max(...Object.values(stats.lines), 1) : 1;

  return (
    <>
      <h1>Claims and stats</h1>
      {stats && (
        <p className={styles.summary}>
          {month} so far: <strong className="num">£{stats.money.readyValue}</strong> ready to claim from{" "}
          {stats.money.readyCount} {stats.money.readyCount === 1 ? "case" : "cases"}. Another{" "}
          <strong className="num">£{stats.money.openCompletedValue}</strong> of completed stages sits in {stats.money.openCount} open{" "}
          {stats.money.openCount === 1 ? "case" : "cases"}. Claimed this month: <strong className="num">£{stats.money.claimedThisMonthValue}</strong>{" "}
          from {stats.money.claimedThisMonthCount} {stats.money.claimedThisMonthCount === 1 ? "case" : "cases"}.
        </p>
      )}
      {message && (
        <div className={form.alert} role="alert">
          {message}
        </div>
      )}
      {!claims && !message && <p role="status">Loading your claims…</p>}
      {claims && claims.length === 0 && (
        <div className={page.panel}>
          <p>
            No cases yet. <Link to="/cases/new">Create a case</Link> or <Link to="/demo">copy a demo case</Link>; claims appear
            here as stages are completed.
          </p>
        </div>
      )}

      {claims && claims.length > 0 && (
        <div className={styles.columns}>
          <section aria-labelledby="work-title">
            <h2 id="work-title">Claim work</h2>
            <table className={page.table}>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Stages completed</th>
                  <th className={page.right}>Value</th>
                  <th>Claim by</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.caseId} className={claim.caseId === selectedId ? styles.selected : undefined}>
                    <td className={page.main} data-label="Case">
                      <button
                        className={styles.rowButton}
                        type="button"
                        aria-pressed={claim.caseId === selectedId}
                        onClick={() => setParams({ case: claim.caseId })}
                      >
                        {claim.reference}
                      </button>
                    </td>
                    <td data-label="Stages">{stagesDone(claim)}</td>
                    <td className={`num ${page.right}`} data-label="Value">
                      £{claim.value}
                    </td>
                    <td className="num" data-label="Claim by">
                      {claim.claimBy ? longDate(claim.claimBy) : <span className={page.muted}>When all stages are done</span>}
                    </td>
                    <td data-label="Status">{claim.claimStatus === "ready" ? <strong>{statusWords(claim)}</strong> : statusWords(claim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={`${page.small} ${page.muted}`}>
              Fees per stage: £{STAGE_FEES[1]}, £{STAGE_FEES[2]}, £{STAGE_FEES[3]}. Check the fees and the claim window against
              the current Drug Tariff.
            </p>
          </section>

          {selected && (
            <section className={page.panel} aria-labelledby="summary-title">
              <h2 id="summary-title">Claim summary: {selected.reference}</h2>
              <p className={`${page.small} ${page.muted}`}>Copy each field into the DMS claim in Manage Your Service, in this order.</p>
              <dl className={styles.copyList}>
                <CopyRow label="Referral received" value={longDate(selected.referralReceivedAt)} />
                <CopyRow label="Referring hospital" value={selected.hospitalName ?? "Not recorded"} />
                {[1, 2, 3].map((stage) => (
                  <CopyRow key={stage} label={`Stage ${stage}: ${STAGE_TITLES[stage].toLowerCase()}`} value={stageField(selected, stage)} />
                ))}
              </dl>
              {selected.claimBy ? (
                <p className={styles.deadline}>
                  <strong>Claim by {longDate(selected.claimBy)}.</strong> Claim by {longDate(selected.earliestPaymentBy)} for the
                  earliest payment.
                </p>
              ) : (
                <p className={styles.deadline}>The claim-by date appears when every stage is completed or not applicable.</p>
              )}
              <p className={`${page.small} ${page.muted}`}>
                Rule per Community Pharmacy England (claim period extended to three months from July 2024). Check the current
                Drug Tariff. Fields to confirm against the current MYS claim form before go-live.
              </p>
              <div className={page.btnRow}>
                {selected.claimStatus === "ready" && (
                  <button className={form.button} type="button" onClick={handleMarkClaimed} disabled={busy}>
                    {busy ? "Saving…" : "Mark as claimed"}
                  </button>
                )}
                <Link className={form.buttonSecondary} to={`/cases/${selected.caseId}`}>
                  Open case {selected.reference}
                </Link>
              </div>
            </section>
          )}
        </div>
      )}

      {stats && stats.caseCount > 0 && (
        <section className={styles.found} aria-labelledby="found-title">
          <h2 id="found-title">What the comparisons found</h2>
          <p className={page.muted}>
            Across your {stats.caseCount} {stats.caseCount === 1 ? "case" : "cases"} (stage 1 comparisons, synthetic data).
          </p>
          <div className={`${page.panel} ${styles.bars}`}>
            <Bar label="Unchanged" count={stats.lines.unchanged} max={lineMax} />
            <Bar label="Changed" count={stats.lines.changed} max={lineMax} />
            <Bar label="Started" count={stats.lines.started} max={lineMax} />
            <Bar label="Stopped" count={stats.lines.stopped} max={lineMax} />
            <Bar label="Needed review" count={stats.lines.neededReview} max={lineMax} />
            <p className={`${page.small} ${page.muted} ${styles.highRisk}`}>
              {stats.highRisk.length === 0
                ? "No high-risk medicines in your comparisons."
                : `High-risk medicines by group: ${stats.highRisk.map((h) => `${h.category.toLowerCase()} (${h.count})`).join(", ")}.`}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
