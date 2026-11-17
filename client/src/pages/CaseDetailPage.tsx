// Case detail with the DMS stage tracker (docs/designs/case-detail-desktop.png; D-021, D-032, D-036, D-048).
// The same page shows your own cases (/cases/:id) and the public read-only demo cases (/demo/:id).
// Stage 1 compares pre-admission → discharge, stage 2 discharge → first new prescription (same engine), stage 3 is
// the consultation (notes). The server enforces the approval gate; the page only mirrors it.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { initials, type CaseDetail, type DmsStage, type ReconciliationLine } from "@dischargeiq/shared";
import { copyDemoCase, getCase, getReconciliation } from "../api/cases";
import { completeStage, updateStage } from "../api/stages";
import { useAuth } from "../auth/AuthContext";
import { ComparisonCounts, ReconciliationView, unresolvedLines } from "../components/ReconciliationView";
import { ActionBar, CheckDialog, NotApplicableDialog, StageNotes } from "../components/StageControls";
import { StageStrip, STAGE_TITLES } from "../components/StageStrip";
import { describeHoursLeft, formatDateTime, stageOneHoursLeft } from "../format";
import form from "../components/Form.module.css";
import page from "../components/Page.module.css";
import recon from "../components/Recon.module.css";

export function CaseDetailPage({ demo }: { demo: boolean }) {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [active, setActive] = useState<1 | 2 | 3 | null>(null);
  const [lines, setLines] = useState<ReconciliationLine[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<ReconciliationLine | null>(null);
  const [naOpen, setNaOpen] = useState(false);
  const [naError, setNaError] = useState("");
  const [saveText, setSaveText] = useState("");

  const loadCase = useCallback(async (): Promise<CaseDetail | null> => {
    const result = await getCase(id, demo);
    if (!result.ok) {
      setMessage(result.message);
      return null;
    }
    setCaseDetail(result.case);
    return result.case;
  }, [id, demo]);

  // First load: open the stage in progress (the first one not yet completed).
  useEffect(() => {
    loadCase().then((loaded) => {
      const firstPending = loaded?.stages.find((s) => s.status === "pending")?.stage;
      setActive(firstPending === 2 ? 2 : firstPending === 3 ? 3 : 1);
    });
  }, [loadCase]);

  // The comparison for the stage on screen (stages 1 and 2 only).
  const loadLines = useCallback(async (): Promise<void> => {
    if (active !== 1 && active !== 2) return;
    setLines(null);
    const result = await getReconciliation(id, active, demo);
    if (result.ok) setLines(result.lines);
    else setMessage(result.message);
  }, [id, active, demo]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  async function handleCopy(): Promise<void> {
    setBusy(true);
    const result = await copyDemoCase(id);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    navigate(`/cases/${result.case.id}/edit`);
  }

  // Every stage change returns the three stages as they now are.
  function applyStages(stages: DmsStage[]): void {
    setCaseDetail((current) => (current ? { ...current, stages } : current));
  }

  async function confirmCheck(line: ReconciliationLine, note: string): Promise<void> {
    if (!active) return;
    setChecking(null);
    const result = await updateStage(id, active, { acknowledge: { key: line.key, note: note || undefined } });
    if (result.ok) applyStages(result.stages);
    else setMessage(result.message);
  }

  async function uncheck(line: ReconciliationLine): Promise<void> {
    if (!active) return;
    const result = await updateStage(id, active, { unacknowledge: line.key });
    if (result.ok) applyStages(result.stages);
    else setMessage(result.message);
  }

  async function complete(): Promise<void> {
    if (!active) return;
    setBusy(true);
    setMessage("");
    const result = await completeStage(id, active);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    await loadCase(); // claim status may have changed
  }

  async function markNotApplicable(reason: string): Promise<void> {
    if (!active) return;
    const result = await updateStage(id, active, { status: "not_applicable", notApplicableReason: reason });
    if (!result.ok) {
      setNaError(result.fields.notApplicableReason ?? result.message);
      return;
    }
    setNaOpen(false);
    setNaError("");
    await loadCase();
  }

  async function reopen(): Promise<void> {
    if (!active) return;
    setBusy(true);
    const result = await updateStage(id, active, { status: "pending" });
    setBusy(false);
    if (!result.ok) setMessage(result.message);
    else await loadCase();
  }

  const saveNotes = useCallback(
    async (notes: string): Promise<boolean> => {
      if (!active) return false;
      const result = await updateStage(id, active, { notes });
      if (!result.ok) setMessage(result.message);
      return result.ok;
    },
    [id, active],
  );
  const showSaveState = useCallback((text: string) => setSaveText(text), []);

  if (message && !caseDetail) {
    return (
      <>
        <h1>Case not found</h1>
        <p>{message}</p>
        <Link to={demo ? "/demo" : "/cases"}>{demo ? "Back to demo cases" : "Back to my cases"}</Link>
      </>
    );
  }
  if (!caseDetail || !active) {
    return <p role="status">Loading the case…</p>;
  }

  const base = demo ? `/demo/${id}` : `/cases/${id}`;
  const stage = caseDetail.stages.find((s) => s.stage === active);
  const acks = stage?.acknowledgements ?? [];
  const locked = caseDetail.claimStatus === "claimed";
  const editable = !demo && !locked && stage?.status === "pending";
  const unresolved = lines ? unresolvedLines(lines, acks).length : 0;
  const hasDischargeList = caseDetail.medicines.some((m) => m.listType === "discharge");
  const hasNewPrescription = caseDetail.medicines.some((m) => m.listType === "new_prescription");
  const hours = stageOneHoursLeft(caseDetail.referralReceivedAt);
  const stageOnePending = caseDetail.stages.find((s) => s.stage === 1)?.status === "pending";
  const showsComparison = (active === 1 && (hasDischargeList || demo)) || (active === 2 && hasNewPrescription);
  // What else stops completion, in words (the server checks the same things).
  const blocker =
    active === 1 && !hasDischargeList
      ? "Read the letter or add the discharge medicines first."
      : active === 2 && !hasNewPrescription
        ? "Add the first new prescription, or mark this stage as not applicable."
        : lines === null && active !== 3
          ? "Comparing…"
          : "";

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
        <div className={page.meta}>
          {!demo && stageOnePending && hours !== null && (
            <span>
              <strong>Stage 1:</strong> <span className="num">{describeHoursLeft(hours)}</span>
            </span>
          )}
          {saveText && (
            <span role="status" className="num">
              {saveText}
            </span>
          )}
        </div>
      </div>

      {demo && (
        <div className={page.notice}>
          <strong>Demo case: synthetic and read-only.</strong> To try it yourself, copy it into your own cases, then read
          the letter, check the flagged lines and complete the stages.{" "}
          {user ? (
            <button className={`${form.button} ${form.buttonSmall}`} type="button" onClick={handleCopy} disabled={busy}>
              {busy ? "Copying…" : "Copy to my cases"}
            </button>
          ) : (
            <Link to="/login" state={{ from: `/demo/${id}` }}>
              Log in to copy it
            </Link>
          )}
        </div>
      )}
      {!demo && caseDetail.claimStatus !== "not_ready" && (
        <div className={page.success}>
          <strong>{caseDetail.claimStatus === "claimed" ? "Claimed." : "Ready to claim."}</strong>{" "}
          <Link to={`/claims?case=${id}`}>See the claim summary</Link>
        </div>
      )}
      {message && (
        <div className={form.alert} role="alert">
          {message}
        </div>
      )}

      <StageStrip
        stages={caseDetail.stages}
        active={active}
        onSelect={(next) => {
          setMessage("");
          setSaveText("");
          setActive(next);
        }}
      />

      <section aria-labelledby="stage-title">
        <div className={recon.top}>
          <h2 id="stage-title">
            Stage {active}: {STAGE_TITLES[active]}
          </h2>
          {showsComparison && lines && <ComparisonCounts lines={lines} unresolved={unresolved} />}
        </div>

        {active === 1 && !hasDischargeList && !demo && (
          <div className={page.panel}>
            <p>Paste the discharge letter and read it, or add the discharge medicines by hand. The comparison appears here.</p>
            <Link className={form.button} to={`/cases/${id}/edit`}>
              Add the letter and medicines
            </Link>
          </div>
        )}
        {active === 2 && !hasNewPrescription && (
          <div className={page.panel}>
            <p>
              When the first new prescription after discharge arrives, add its medicines. They are checked against the
              discharge list with the same comparison, and every difference must be checked before this stage is complete.
            </p>
            {!demo && (
              <Link className={form.button} to={`/cases/${id}/edit`}>
                Add the new prescription
              </Link>
            )}
          </div>
        )}
        {active === 3 && (
          <div className={page.panel}>
            <p>
              Talk with the patient or their carer about the changes found in stages 1 and 2. Record what you discussed in
              the notes below, then complete the stage. The app records your decision; it doesn't make it.
            </p>
          </div>
        )}

        {showsComparison && !lines && <p role="status">Comparing…</p>}
        {showsComparison && lines && lines.length === 0 && <div className={recon.empty}>No medicines on either list yet.</div>}
        {showsComparison && lines && lines.length > 0 && (
          <ReconciliationView
            lines={lines}
            beforeTitle={active === 1 ? "Before admission (PMR)" : "On discharge (letter)"}
            afterTitle={active === 1 ? "On discharge (letter)" : "First new prescription"}
            medicineLink={(medicineId) => `${base}/medicines/${medicineId}`}
            acknowledgements={acks}
            onCheck={editable ? (line) => setChecking(line) : undefined}
            onUncheck={editable ? uncheck : undefined}
          />
        )}
      </section>

      {!demo && stage && (
        <div className={recon.notesGap}>
          <StageNotes
            key={active}
            stage={active}
            initialNotes={stage.notes ?? ""}
            readOnly={locked}
            onSave={saveNotes}
            onStateChange={showSaveState}
          />
          <div className={page.btnRow}>
            <Link className={form.buttonSecondary} to={`/cases/${id}/edit`}>
              Edit medicines or letter
            </Link>
          </div>
        </div>
      )}

      {!demo && stage && (
        <ActionBar
          stage={stage}
          unresolved={active === 3 ? 0 : unresolved}
          blocker={blocker}
          busy={busy}
          locked={locked}
          onComplete={complete}
          onNotApplicable={() => setNaOpen(true)}
          onReopen={reopen}
        />
      )}

      {user && (
        <CheckDialog line={checking} initials={initials(user.displayName)} onConfirm={confirmCheck} onClose={() => setChecking(null)} />
      )}
      <NotApplicableDialog
        stage={active}
        open={naOpen}
        error={naError}
        onConfirm={markNotApplicable}
        onClose={() => {
          setNaOpen(false);
          setNaError("");
        }}
      />
    </>
  );
}
