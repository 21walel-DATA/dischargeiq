// New case and edit case (docs/designs/case-form-desktop.png).
// New: referral details + letter → "Create case". Edit: the same, plus the three medicine lists and "Read the letter".
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { caseCreateSchema, type AiMode, type CaseCreate, type CaseDetail } from "@dischargeiq/shared";
import { createCase, deleteCase, extractFromLetter, getAiMode, getCase, updateCase } from "../api/cases";
import { MedicineListEditor } from "../components/MedicineListEditor";
import { fromLocalInputValue, toLocalInputValue } from "../format";
import form from "../components/Form.module.css";
import page from "../components/Page.module.css";
import styles from "./CaseFormPage.module.css";

// A suggested pseudonymous reference, never a patient's name (golden rule 14).
function suggestReference(): string {
  return `DMS-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

type Draft = { reference: string; referralReceivedAt: string; hospitalName: string; letterText: string };

export function CaseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === undefined;

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [draft, setDraft] = useState<Draft>({
    reference: suggestReference(),
    referralReceivedAt: toLocalInputValue(new Date().toISOString()),
    hospitalName: "",
    letterText: "",
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState<"" | "saving" | "reading">("");
  const [aiMode, setAiMode] = useState<AiMode | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  // Loads (or reloads) the case. useCallback keeps the same function between renders, so useEffect runs once.
  const load = useCallback(async (): Promise<void> => {
    if (!id) return;
    const result = await getCase(id, false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setCaseDetail(result.case);
    setDraft({
      reference: result.case.reference,
      referralReceivedAt: toLocalInputValue(result.case.referralReceivedAt),
      hospitalName: result.case.hospitalName ?? "",
      letterText: result.case.letterText ?? "",
    });
  }, [id]);

  useEffect(() => {
    load();
    getAiMode().then(setAiMode);
  }, [load]);

  function detailsToSend(): CaseCreate {
    return {
      reference: draft.reference,
      referralReceivedAt: fromLocalInputValue(draft.referralReceivedAt),
      hospitalName: draft.hospitalName,
      letterText: draft.letterText,
    };
  }

  // Checks with the shared rules first (instant messages, incl. the NHS number guard), then saves.
  async function save(): Promise<boolean> {
    setMessage("");
    setSaved("");
    const details = detailsToSend();
    const check = caseCreateSchema.safeParse(details);
    if (!check.success) {
      const firstPerField: Record<string, string> = {};
      for (const issue of check.error.issues) {
        const key = String(issue.path[0]);
        if (!(key in firstPerField)) firstPerField[key] = issue.message;
      }
      setFields(firstPerField);
      setMessage("Check the details you entered.");
      return false;
    }
    setFields({});
    const result = id ? await updateCase(id, details) : await createCase(details);
    if (!result.ok) {
      setMessage(result.message);
      setFields(result.fields);
      return false;
    }
    if (isNew) {
      navigate(`/cases/${result.case.id}/edit`, { replace: true });
    } else {
      setCaseDetail(result.case);
      setSaved("Changes saved.");
    }
    return true;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy("saving");
    await save();
    setBusy("");
  }

  // Saves the letter as it is now, then asks the server to read it and goes to the comparison.
  async function handleRead(): Promise<void> {
    if (!id) return;
    setBusy("reading");
    const savedOk = await save();
    if (!savedOk) {
      setBusy("");
      return;
    }
    const result = await extractFromLetter(id);
    setBusy("");
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    navigate(`/cases/${id}`);
  }

  async function handleDelete(): Promise<void> {
    if (!id) return;
    const result = await deleteCase(id);
    deleteDialog.current?.close();
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    navigate("/cases");
  }

  const medicines = caseDetail?.medicines ?? [];
  const textField = (key: keyof Draft, label: string, hint: string, type = "text"): ReactElement => (
    <div className={form.field}>
      <label className={form.label} htmlFor={key}>
        {label}
      </label>
      <span className={form.hint} id={`${key}-hint`}>
        {hint}
      </span>
      <input
        className={`${form.input} ${type === "text" ? "" : "num"}`}
        id={key}
        type={type}
        value={draft[key]}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
        aria-invalid={fields[key] ? true : undefined}
        aria-describedby={`${key}-hint${fields[key] ? ` ${key}-error` : ""}`}
      />
      {fields[key] && <FieldError id={`${key}-error`} text={fields[key]} />}
    </div>
  );

  if (!isNew && !caseDetail && !message) {
    return <p role="status">Loading the case…</p>;
  }

  return (
    <>
      <Link className={page.backLink} to={isNew ? "/cases" : `/cases/${id}`}>
        {isNew ? "Back to my cases" : "Back to the comparison"}
      </Link>
      <div className={page.head}>
        <h1>{isNew ? "New case" : `Edit case ${caseDetail?.reference ?? ""}`}</h1>
      </div>

      <div className={page.notice}>
        <strong>Synthetic data only.</strong> Don't enter names, addresses, dates of birth or NHS numbers. A real NHS number
        will be rejected.
      </div>

      {message && (
        <div className={form.alert} role="alert">
          <strong>{message}</strong>
        </div>
      )}
      {saved && (
        <div className={page.success} role="status">
          {saved}
        </div>
      )}

      <form onSubmit={handleSave} noValidate>
        <section className={page.panel} aria-labelledby="referral-title">
          <h2 id="referral-title">Referral</h2>
          <div className={styles.metaGrid}>
            {textField("reference", "Case reference", "Your own code, never a patient's name")}
            {textField("referralReceivedAt", "Referral received", "Starts the 72-hour stage 1 target", "datetime-local")}
            {textField("hospitalName", "Hospital (optional)", "As written on the letter")}
          </div>
        </section>

        <section className={page.panel} aria-labelledby="letter-title">
          <h2 id="letter-title">Discharge letter</h2>
          <div className={form.field}>
            <label className={form.label} htmlFor="letterText">
              Paste the discharge letter
            </label>
            <span className={form.hint} id="letterText-hint">
              The letter reader lists the discharge medicines and quotes the sentence each one came from. You check every
              line before anything is approved.
            </span>
            <textarea
              className={`${form.input} ${styles.letter}`}
              id="letterText"
              value={draft.letterText}
              onChange={(event) => setDraft({ ...draft, letterText: event.target.value })}
              aria-invalid={fields.letterText ? true : undefined}
              aria-describedby={`letterText-hint${fields.letterText ? " letterText-error" : ""}`}
            />
            {fields.letterText && <FieldError id="letterText-error" text={fields.letterText} />}
          </div>
          <div className={page.btnRow}>
            {isNew ? (
              <button className={form.button} type="submit" disabled={busy !== ""}>
                {busy === "saving" ? "Creating case…" : "Create case"}
              </button>
            ) : (
              <>
                <button className={form.button} type="button" onClick={handleRead} disabled={busy !== ""}>
                  {busy === "reading" ? "Reading the letter…" : "Save and read the letter"}
                </button>
                <button className={form.buttonSecondary} type="submit" disabled={busy !== ""}>
                  {busy === "saving" ? "Saving…" : "Save changes"}
                </button>
                {aiMode === "mock" && (
                  <span className={page.demoMode}>Demo mode: sample extraction</span>
                )}
              </>
            )}
          </div>
          {!isNew && (
            <p className={`${page.small} ${page.muted} ${styles.after}`}>
              Reading replaces the discharge list below. If the letter can't be read, add the discharge medicines by hand.
              {aiMode === "mock" && " Demo mode recognises the synthetic demo letter only; for other letters, add medicines by hand."}
            </p>
          )}
        </section>
      </form>

      {!isNew && id && (
        <>
          <MedicineListEditor
            caseId={id}
            listType="pre_admission"
            title="Medicines before admission"
            hint="Copy from the PMR: one line per medicine."
            medicines={medicines.filter((m) => m.listType === "pre_admission")}
            onChanged={load}
          />
          <MedicineListEditor
            caseId={id}
            listType="discharge"
            title="Medicines on discharge"
            hint="Filled in by reading the letter. Check each line; add any it missed."
            medicines={medicines.filter((m) => m.listType === "discharge")}
            onChanged={load}
          />
          <MedicineListEditor
            caseId={id}
            listType="new_prescription"
            title="First new prescription (stage 2)"
            hint="When the first prescription after discharge arrives, add its medicines to check them against the discharge list."
            medicines={medicines.filter((m) => m.listType === "new_prescription")}
            onChanged={load}
          />

          <div className={`${page.btnRow} ${page.spaced}`}>
            <Link className={form.buttonSecondary} to={`/cases/${id}`}>
              Go to comparison
            </Link>
            <button className={form.buttonSecondary} type="button" onClick={() => deleteDialog.current?.showModal()}>
              Delete this case…
            </button>
          </div>

          <dialog className={page.dialog} ref={deleteDialog} aria-labelledby="delete-title">
            <h2 id="delete-title">Delete case {caseDetail?.reference}?</h2>
            <p>This deletes the case, its medicines and its stage records. It can't be undone.</p>
            <div className={page.btnRow}>
              <button className={form.button} type="button" onClick={handleDelete}>
                Delete case
              </button>
              <button className={form.buttonSecondary} type="button" onClick={() => deleteDialog.current?.close()}>
                Keep the case
              </button>
            </div>
          </dialog>
        </>
      )}
    </>
  );
}

function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <span className={form.error} id={id}>
      <span className={form.errorMark} aria-hidden="true">
        !
      </span>
      {text}
    </span>
  );
}
