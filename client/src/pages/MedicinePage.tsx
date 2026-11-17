// Medicine detail (docs/designs/medicine-detail-desktop.png): one comparison line in full. The two labels, the
// letter with the source sentence highlighted, what was compared, why it's flagged, and (own cases) an edit form.
import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { medicineUpdateSchema, type CaseDetail, type Medicine, type ReconciliationLine } from "@dischargeiq/shared";
import { getCase, getReconciliation, updateMedicine } from "../api/cases";
import { EmptyLabel, MedicineLabel } from "../components/MedicineLabel";
import { StatusMark } from "../components/StatusMark";
import form from "../components/Form.module.css";
import page from "../components/Page.module.css";
import recon from "../components/Recon.module.css";
import styles from "./MedicinePage.module.css";

// Splits the letter around the quoted sentence so it can be highlighted. Matching ignores extra spaces and line
// breaks, like the server's hallucination check. Returns null when the sentence isn't in the letter.
function findSentence(letter: string, sentence: string): { before: string; match: string; after: string } | null {
  const words = sentence.trim().split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0 || words[0] === "") return null;
  const found = new RegExp(words.join("\\s+"), "i").exec(letter);
  if (!found) return null;
  return {
    before: letter.slice(0, found.index),
    match: found[0],
    after: letter.slice(found.index + found[0].length),
  };
}

const EDITABLE: { key: "name" | "strength" | "dose" | "frequency" | "form" | "route"; label: string }[] = [
  { key: "name", label: "Medicine" },
  { key: "strength", label: "Strength" },
  { key: "dose", label: "Dose" },
  { key: "frequency", label: "How often" },
  { key: "form", label: "Form" },
  { key: "route", label: "Route" },
];

export function MedicinePage({ demo }: { demo: boolean }) {
  const { id = "", medicineId = "" } = useParams();
  const navigate = useNavigate();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [line, setLine] = useState<ReconciliationLine | null>(null);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const letterBox = useRef<HTMLDivElement>(null);

  // Scroll the letter box (not the whole page) so the highlighted sentence is in view.
  useEffect(() => {
    const box = letterBox.current;
    const mark = box?.querySelector("mark");
    if (box && mark) box.scrollTop = Math.max(0, mark.offsetTop - box.offsetTop - 48);
  });

  useEffect(() => {
    async function load(): Promise<void> {
      const caseResult = await getCase(id, demo);
      if (!caseResult.ok) {
        setMessage(caseResult.message);
        return;
      }
      setCaseDetail(caseResult.case);
      const medicine = caseResult.case.medicines.find((m) => m.id === medicineId);
      if (!medicine) {
        setMessage("We couldn't find that medicine. It may have been edited or deleted.");
        return;
      }
      setDraft({
        name: medicine.name,
        strength: medicine.strength ?? "",
        dose: medicine.dose ?? "",
        frequency: medicine.frequency ?? "",
        form: medicine.form ?? "",
        route: medicine.route ?? "",
      });
      // A new-prescription medicine belongs to the stage 2 check; everything else to stage 1.
      const stage = medicine.listType === "new_prescription" ? 2 : 1;
      const reconResult = await getReconciliation(id, stage, demo);
      if (reconResult.ok) {
        setLine(reconResult.lines.find((l) => l.from?.id === medicineId || l.to?.id === medicineId) ?? null);
      }
    }
    load();
  }, [id, medicineId, demo]);

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const check = medicineUpdateSchema.safeParse(draft);
    if (!check.success) {
      const firstPerField: Record<string, string> = {};
      for (const issue of check.error.issues) {
        const key = String(issue.path[0]);
        if (!(key in firstPerField)) firstPerField[key] = issue.message;
      }
      setFields(firstPerField);
      return;
    }
    setBusy(true);
    const result = await updateMedicine(medicineId, draft);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      setFields(result.fields);
      return;
    }
    // Editing gives the medicine a new id (so its comparison line must be checked again, D-032).
    navigate(`/cases/${id}/medicines/${result.medicine.id}`, { replace: true });
  }

  const caseLink = demo ? `/demo/${id}` : `/cases/${id}`;
  if (message && !caseDetail) {
    return (
      <>
        <h1>Medicine not found</h1>
        <p>{message}</p>
        <Link to={demo ? "/demo" : "/cases"}>Back</Link>
      </>
    );
  }
  if (!caseDetail) return <p role="status">Loading…</p>;

  const medicine: Medicine | undefined = caseDetail.medicines.find((m) => m.id === medicineId);
  const sourceText = line?.sourceText ?? medicine?.sourceText ?? null;
  const highlighted = sourceText && caseDetail.letterText ? findSentence(caseDetail.letterText, sourceText) : null;
  const isStage2 = medicine?.listType === "new_prescription";
  const beforeTitle = isStage2 ? "On discharge (letter)" : "Before admission (PMR)";
  const afterTitle = isStage2 ? "First new prescription" : "On discharge (letter)";

  const row = (label: string, before: string | null | undefined, after: string | null | undefined): ReactElement => (
    <tr>
      <td data-label="Field">
        <strong>{label}</strong>
      </td>
      <td data-label="Before" className="num">
        {before || <span className={page.muted}>Not stated</span>}
      </td>
      <td data-label="After" className="num">
        {after || <span className={page.muted}>Not stated</span>}
      </td>
    </tr>
  );
  const afterIsLetterStop = line?.to && (line.to.letterStatus === "stopped" || line.to.letterStatus === "withheld");

  return (
    <>
      <Link className={page.backLink} to={caseLink}>
        Back to case {caseDetail.reference}
      </Link>
      <div className={page.head}>
        <div>
          <h1>{medicine?.name ?? "Medicine"}</h1>
          {line && (
            <div className={styles.statusRow}>
              <StatusMark kind={line.changeType} />
              {line.changeDetails.map((d) => (
                <span className={`${page.small} num`} key={d}>
                  {d}
                </span>
              ))}
              {line.needsReview && <StatusMark kind="review" />}
            </div>
          )}
        </div>
      </div>
      {message && (
        <div className={form.alert} role="alert">
          {message}
        </div>
      )}

      {line && (
        <div className={styles.pair}>
          <div>
            <div className={styles.tag}>{beforeTitle}</div>
            {line.from ? <MedicineLabel medicine={line.from} look="plain" highRiskReason={line.highRiskReason} /> : <EmptyLabel text="Not on this list" />}
          </div>
          <div>
            <div className={styles.tag}>{afterTitle}</div>
            {line.to && !afterIsLetterStop ? (
              <MedicineLabel medicine={line.to} look="plain" highRiskReason={line.highRiskReason} />
            ) : (
              <EmptyLabel text={afterIsLetterStop ? `Not on the list: the letter says ${line.to?.letterStatus}` : "Not on this list"} />
            )}
          </div>
        </div>
      )}

      <div className={styles.columns}>
        <section>
          <h2>Where this came from in the letter</h2>
          {!sourceText && <p className={page.muted}>This line was typed in, not read from the letter.</p>}
          {sourceText && highlighted && (
            <>
              <div className={styles.letter} ref={letterBox}>
                {highlighted.before}
                <mark className={styles.mark}>{highlighted.match}</mark>
                {highlighted.after}
              </div>
              <p className={`${page.small} ${page.muted}`}>The highlighted sentence was found word for word in the letter.</p>
            </>
          )}
          {sourceText && !highlighted && (
            <div className={form.alert} role="note">
              <strong>This sentence isn't in the letter:</strong> “{sourceText}”. Check this line against the letter.
            </div>
          )}

          {line && (
            <>
              <h2 className={styles.gap}>What was compared</h2>
              <table className={page.table}>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>{beforeTitle}</th>
                    <th>{afterTitle}</th>
                  </tr>
                </thead>
                <tbody>
                  {row("Medicine", line.from?.name, afterIsLetterStop ? null : line.to?.name)}
                  {row("Strength", line.from?.strength, afterIsLetterStop ? null : line.to?.strength)}
                  {row("Dose", line.from?.dose, afterIsLetterStop ? null : line.to?.dose)}
                  {row("How often", line.from?.frequency, afterIsLetterStop ? null : line.to?.frequency)}
                </tbody>
              </table>
              <p className={page.small}>
                <strong>Result:</strong>{" "}
                {[...line.changeDetails, line.timingNote].filter(Boolean).join("; ") ||
                  (line.changeType === "unchanged"
                    ? "No change found."
                    : line.changeType === "started"
                      ? "New on this list."
                      : line.letterStatus
                        ? `Stopped: the letter says ${line.letterStatus}.`
                        : "Not on the later list.")}
              </p>
            </>
          )}
        </section>

        <aside className={styles.aside}>
          {line?.needsReview && (
            <div className={page.panel}>
              <h3>Why it needs review</h3>
              <ul className={styles.reasons}>
                {line.reviewReasons.map((reason) => (
                  <li key={reason}>
                    <span className={recon.highlight}>{reason}</span>
                  </li>
                ))}
              </ul>
              <p className={`${page.small} ${page.muted}`}>The comparison won't guess. A pharmacist checks this line.</p>
            </div>
          )}
          {line?.highRiskReason && (
            <div className={page.panel}>
              <h3>Why it's flagged high-risk</h3>
              <p>
                {line.highRiskReason}. The high-risk list follows the UK APINCHS framework. Take extra care checking
                this line.
              </p>
              <p className={`${page.small} ${page.muted}`}>From the pharmacy's own rules list, not from AI.</p>
            </div>
          )}

          {!demo && medicine && (
            <form className={page.panel} onSubmit={handleSave} noValidate>
              <h3>Edit this medicine</h3>
              <p className={`${page.small} ${page.muted}`}>Saving marks it as edited by you, and its comparison line must be checked again.</p>
              {EDITABLE.map(({ key, label }) => (
                <div className={form.field} key={key}>
                  <label className={form.label} htmlFor={`edit-${key}`}>
                    {label}
                  </label>
                  <input
                    className={`${form.input} ${key === "strength" ? "num" : ""}`}
                    id={`edit-${key}`}
                    value={draft[key] ?? ""}
                    onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    aria-invalid={fields[key] ? true : undefined}
                  />
                  {fields[key] && <span className={form.error}>{fields[key]}</span>}
                </div>
              ))}
              <button className={form.buttonSecondary} type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save medicine"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
