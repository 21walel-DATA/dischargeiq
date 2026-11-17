// "My cases" (docs/designs/my-cases-desktop.png): your own cases, most recently changed first.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { CaseSummary } from "@dischargeiq/shared";
import { listMyCases } from "../api/cases";
import { StagePips } from "../components/StageStrip";
import { describeHoursLeft, formatDateTime, stageOneHoursLeft } from "../format";
import form from "../components/Form.module.css";
import page from "../components/Page.module.css";

const CLAIM_WORDS: Record<CaseSummary["claimStatus"], string> = {
  not_ready: "Not ready",
  ready: "Ready to claim",
  claimed: "Claimed",
};

function StageOneTarget({ item }: { item: CaseSummary }) {
  const stageOne = item.stages.find((s) => s.stage === 1);
  if (stageOne && stageOne.status !== "pending") {
    return <span className={page.muted}>{stageOne.status === "completed" ? "Completed" : "Not applicable"}</span>;
  }
  const hours = stageOneHoursLeft(item.referralReceivedAt);
  if (hours === null) return <span className={page.muted}>Referral time not recorded</span>;
  return <span className={`num ${hours < 0 ? page.overdue : hours <= 24 ? page.dueSoon : ""}`}>{describeHoursLeft(hours)}</span>;
}

export function MyCasesPage() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listMyCases().then((result) => {
      if (result.ok) setCases(result.cases);
      else setError(result.message);
    });
  }, []);

  const dueSoon = (cases ?? []).filter((c) => {
    const hours = stageOneHoursLeft(c.referralReceivedAt);
    return c.stages[0]?.status === "pending" && hours !== null && hours <= 24;
  }).length;

  return (
    <>
      <div className={page.head}>
        <div>
          <h1>My cases</h1>
          {cases && cases.length > 0 && (
            <p className={page.lead}>
              <strong className="num">
                {dueSoon} {dueSoon === 1 ? "case needs" : "cases need"}
              </strong>{" "}
              stage 1 within 24 hours.
            </p>
          )}
        </div>
        <Link className={form.button} to="/cases/new">
          New case
        </Link>
      </div>

      {error && (
        <div className={form.alert} role="alert">
          {error}
        </div>
      )}
      {!cases && !error && <p role="status">Loading your cases…</p>}

      {cases && cases.length === 0 && (
        <div className={page.panel}>
          <h2>No cases yet</h2>
          <p>
            Create your first case, or <Link to="/demo">copy a demo case</Link> to try the comparison with a synthetic
            discharge letter.
          </p>
          <Link className={form.button} to="/cases/new">
            Create your first case
          </Link>
        </div>
      )}

      {cases && cases.length > 0 && (
        <table className={page.table}>
          <thead>
            <tr>
              <th>Case</th>
              <th>Referral received</th>
              <th>Stage 1 target</th>
              <th>Stages</th>
              <th>Claim</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.id}>
                <td className={page.main} data-label="Case">
                  <Link to={`/cases/${item.id}`}>
                    <strong>{item.reference}</strong>
                  </Link>
                </td>
                <td className="num" data-label="Referral">
                  {formatDateTime(item.referralReceivedAt)}
                </td>
                <td data-label="Stage 1 target">
                  <StageOneTarget item={item} />
                </td>
                <td data-label="Stages">
                  <StagePips stages={item.stages} />
                </td>
                <td data-label="Claim">{CLAIM_WORDS[item.claimStatus]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {cases && cases.length > 0 && (
        <p className={`${page.small} ${page.muted}`}>
          Stages key: filled circle completed, empty circle not done, dashed circle not applicable. The 72-hour target is
          guidance, counted from when the referral arrived.
        </p>
      )}
    </>
  );
}
