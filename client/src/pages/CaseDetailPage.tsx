// Case detail: the comparison (docs/designs/case-detail-desktop.png). The same page shows your own cases
// (/cases/:id) and the public read-only demo cases (/demo/:id), told apart by the `demo` prop.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { CaseDetail, ReconciliationLine } from "@dischargeiq/shared";
import { copyDemoCase, getCase, getReconciliation } from "../api/cases";
import { useAuth } from "../auth/AuthContext";
import { ComparisonCounts, ReconciliationView } from "../components/ReconciliationView";
import { StageStrip } from "../components/StageStrip";
import { describeHoursLeft, formatDateTime, stageOneHoursLeft } from "../format";
import form from "../components/Form.module.css";
import page from "../components/Page.module.css";
import recon from "../components/Recon.module.css";

export function CaseDetailPage({ demo }: { demo: boolean }) {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [stage, setStage] = useState<1 | 2>(1);
  const [lines, setLines] = useState<ReconciliationLine[] | null>(null);
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    getCase(id, demo).then((result) => {
      if (result.ok) setCaseDetail(result.case);
      else setMessage(result.message);
    });
  }, [id, demo]);

  useEffect(() => {
    setLines(null);
    getReconciliation(id, stage, demo).then((result) => {
      if (result.ok) setLines(result.lines);
      else setMessage(result.message);
    });
  }, [id, stage, demo]);

  async function handleCopy(): Promise<void> {
    setCopying(true);
    const result = await copyDemoCase(id);
    setCopying(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    navigate(`/cases/${result.case.id}/edit`);
  }

  if (message && !caseDetail) {
    return (
      <>
        <h1>Case not found</h1>
        <p>{message}</p>
        <Link to={demo ? "/demo" : "/cases"}>{demo ? "Back to demo cases" : "Back to my cases"}</Link>
      </>
    );
  }
  if (!caseDetail) {
    return <p role="status">Loading the case…</p>;
  }

  const base = demo ? `/demo/${id}` : `/cases/${id}`;
  const hasDischargeList = caseDetail.medicines.some((m) => m.listType === "discharge");
  const hasNewPrescription = caseDetail.medicines.some((m) => m.listType === "new_prescription");
  const hours = stageOneHoursLeft(caseDetail.referralReceivedAt);
  const stageOnePending = caseDetail.stages.find((s) => s.stage === 1)?.status === "pending";

  return (
    <>
      <Link className={page.backLink} to={demo ? "/demo" : "/cases"}>
        {demo ? "Back to demo cases" : "Back to my cases"}
      </Link>
      <div className={page.head}>
        <div>
          <h1>Case {caseDetail.reference}</h1>
          <div className={page.meta}>
            <span>
              Referral received <span className="num">{formatDateTime(caseDetail.referralReceivedAt)}</span>
            </span>
            {caseDetail.hospitalName && <span>{caseDetail.hospitalName}</span>}
          </div>
        </div>
        {!demo && stageOnePending && hours !== null && (
          <span className={page.small}>
            <strong>Stage 1:</strong> <span className="num">{describeHoursLeft(hours)}</span>
          </span>
        )}
      </div>

      {demo && (
        <div className={page.notice}>
          <strong>Demo case: synthetic and read-only.</strong> To try it yourself, copy it into your own cases, then read
          the letter and compare.{" "}
          {user ? (
            <button className={`${form.button} ${form.buttonSmall}`} type="button" onClick={handleCopy} disabled={copying}>
              {copying ? "Copying…" : "Copy to my cases"}
            </button>
          ) : (
            <Link to="/login" state={{ from: `/demo/${id}` }}>
              Log in to copy it
            </Link>
          )}
        </div>
      )}
      {message && (
        <div className={form.alert} role="alert">
          {message}
        </div>
      )}

      <StageStrip stages={caseDetail.stages} />

      {!hasDischargeList && !demo ? (
        <section className={page.panel}>
          <h2>The letter hasn't been read yet</h2>
          <p>Paste the discharge letter and read it, or add the discharge medicines by hand. The comparison appears here.</p>
          <Link className={form.button} to={`/cases/${id}/edit`}>
            Add the letter and medicines
          </Link>
        </section>
      ) : (
        <section aria-labelledby="recon-title">
          <div className={recon.top}>
            <h2 id="recon-title">{stage === 1 ? "Medicines compared" : "First new prescription checked"}</h2>
            {lines && <ComparisonCounts lines={lines} />}
          </div>
          {hasNewPrescription && (
            <div className={`${page.btnRow} ${recon.toggle}`} role="group" aria-label="Which comparison">
              <button
                className={`${stage === 1 ? form.button : form.buttonSecondary} ${form.buttonSmall}`}
                type="button"
                aria-pressed={stage === 1}
                onClick={() => setStage(1)}
              >
                Stage 1: letter vs before admission
              </button>
              <button
                className={`${stage === 2 ? form.button : form.buttonSecondary} ${form.buttonSmall}`}
                type="button"
                aria-pressed={stage === 2}
                onClick={() => setStage(2)}
              >
                Stage 2: new prescription vs discharge
              </button>
            </div>
          )}
          {!lines && <p role="status">Comparing…</p>}
          {lines && lines.length === 0 && <div className={recon.empty}>No medicines on either list yet.</div>}
          {lines && lines.length > 0 && (
            <ReconciliationView
              lines={lines}
              beforeTitle={stage === 1 ? "Before admission (PMR)" : "On discharge (letter)"}
              afterTitle={stage === 1 ? "On discharge (letter)" : "First new prescription"}
              medicineLink={(medicineId) => `${base}/medicines/${medicineId}`}
            />
          )}
        </section>
      )}

      {!demo && (
        <div className={`${page.btnRow} ${page.spaced}`}>
          <Link className={form.buttonSecondary} to={`/cases/${id}/edit`}>
            Edit medicines or letter
          </Link>
        </div>
      )}
    </>
  );
}
