// The pieces of the DMS stage tracker on the case page (D-021, D-032, D-036, D-048):
// the "Checked by" dialog, the "Not applicable" dialog, autosaved notes and the sticky action bar.
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import type { DmsStage, ReconciliationLine } from "@dischargeiq/shared";
import { describeSaveState, useAutosave, type SaveState } from "../useAutosave";
import { StatusMark } from "./StatusMark";
import form from "./Form.module.css";
import page from "./Page.module.css";
import styles from "./StageControls.module.css";

// ---- "Checked by" dialog ------------------------------------------------------------------------------------------

type CheckProps = {
  line: ReconciliationLine | null; // the line being checked; null = closed
  initials: string;
  onConfirm: (line: ReconciliationLine, note: string) => void;
  onClose: () => void;
};

export function CheckDialog({ line, initials, onConfirm, onClose }: CheckProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");

  // Open the native <dialog> whenever a line is chosen (it traps focus and closes with Escape).
  useEffect(() => {
    if (line && !dialog.current?.open) {
      setNote("");
      dialog.current?.showModal();
    }
    if (!line) dialog.current?.close();
  }, [line]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (line) onConfirm(line, note.trim());
  }

  const name = (line?.to ?? line?.from)?.name ?? "";
  return (
    <dialog className={page.dialog} ref={dialog} onClose={onClose} aria-labelledby="check-title">
      <form onSubmit={submit}>
        <h2 id="check-title">Check {name}</h2>
        <ul className={styles.reasons}>
          {line?.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
        <div className={form.field}>
          <label className={form.label} htmlFor="check-note">
            Note (optional)
          </label>
          <span className={form.hint} id="check-note-hint">
            What you checked, e.g. "Same dose, confirmed with the patient". No names or NHS numbers.
          </span>
          <input className={form.input} id="check-note" value={note} maxLength={300} aria-describedby="check-note-hint" onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className={page.btnRow}>
          <button className={form.button} type="submit">
            Add my initials ({initials})
          </button>
          <button className={form.buttonSecondary} type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

// ---- "Not applicable" dialog ------------------------------------------------------------------------------------------

export function NotApplicableDialog({ stage, open, error, onConfirm, onClose }: {
  stage: number;
  open: boolean;
  error: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open && !dialog.current?.open) {
      setReason("");
      dialog.current?.showModal();
    }
    if (!open) dialog.current?.close();
  }, [open]);

  return (
    <dialog className={page.dialog} ref={dialog} onClose={onClose} aria-labelledby="na-title">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(reason.trim());
        }}
      >
        <h2 id="na-title">Mark stage {stage} as not applicable</h2>
        <div className={form.field}>
          <label className={form.label} htmlFor="na-reason">
            Reason
          </label>
          <span className={form.hint} id="na-reason-hint">
            For example: readmitted, declined, or no new prescription received.
          </span>
          <input className={form.input} id="na-reason" value={reason} maxLength={300} aria-invalid={error ? true : undefined} aria-describedby="na-reason-hint" onChange={(e) => setReason(e.target.value)} />
          {error && <span className={form.error}>{error}</span>}
        </div>
        <div className={page.btnRow}>
          <button className={form.button} type="submit">
            Mark as not applicable
          </button>
          <button className={form.buttonSecondary} type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

// ---- Stage notes (autosave) ----------------------------------------------------------------------------------------

export function StageNotes({ stage, initialNotes, readOnly, onSave, onStateChange }: {
  stage: number;
  initialNotes: string;
  readOnly: boolean;
  onSave: (notes: string) => Promise<boolean>;
  onStateChange: (text: string, state: SaveState) => void; // shows "Saving…/Saved 10:42" in the page header
}) {
  const [text, setText] = useState(initialNotes);
  const { state, savedAt, change, flush } = useAutosave(useCallback((notes: string) => onSave(notes), [onSave]));

  useEffect(() => {
    onStateChange(describeSaveState(state, savedAt), state);
  }, [state, savedAt, onStateChange]);

  return (
    <section className={page.panel} aria-labelledby={`notes-${stage}-title`}>
      <h2 id={`notes-${stage}-title`}>Stage {stage} notes</h2>
      <div className={form.field}>
        <label className={form.label} htmlFor={`notes-${stage}`}>
          Notes for this stage
        </label>
        <span className={form.hint} id={`notes-${stage}-hint`}>
          Saved automatically. Don't enter names, addresses or NHS numbers.
        </span>
        <textarea
          className={`${form.input} ${styles.notes}`}
          id={`notes-${stage}`}
          value={text}
          readOnly={readOnly}
          aria-describedby={`notes-${stage}-hint`}
          onChange={(event) => {
            setText(event.target.value);
            change(event.target.value);
          }}
          onBlur={() => void flush()}
        />
        {state === "error" && (
          <span className={form.error}>
            Couldn't save your notes.{" "}
            <button className={`${form.buttonSecondary} ${form.buttonSmall}`} type="button" onClick={() => void flush()}>
              Retry
            </button>
          </span>
        )}
      </div>
    </section>
  );
}

// ---- Sticky action bar -----------------------------------------------------------------------------------------------

function when(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function ActionBar({ stage, unresolved, blocker, busy, locked, onComplete, onNotApplicable, onReopen }: {
  stage: DmsStage;
  unresolved: number;
  blocker: string; // anything else stopping completion, in words ("" = nothing)
  busy: boolean;
  locked: boolean; // claimed cases can't change
  onComplete: () => void;
  onNotApplicable: () => void;
  onReopen: () => void;
}) {
  let message: ReactElement;
  if (locked) {
    message = <span>This case has been claimed. Its stages can't be changed.</span>;
  } else if (stage.status === "completed") {
    message = (
      <StatusMark kind="resolved" text={`Stage ${stage.stage} completed${stage.completedByInitials ? ` by ${stage.completedByInitials}` : ""} ${when(stage.completedAt)}`} />
    );
  } else if (stage.status === "not_applicable") {
    message = <span>Not applicable: {stage.notApplicableReason}</span>;
  } else if (unresolved > 0) {
    message = <StatusMark kind="review" text={`${unresolved} ${unresolved === 1 ? "line still needs" : "lines still need"} checking`} />;
  } else if (blocker) {
    message = <span>{blocker}</span>;
  } else {
    message = <StatusMark kind="resolved" text="Nothing left to check" />;
  }

  return (
    <div className={styles.bar} role="region" aria-label={`Stage ${stage.stage} actions`}>
      <div className={styles.barInner} aria-live="polite">
        {message}
        {!locked && (
          <div className={page.btnRow}>
            {stage.status === "pending" ? (
              <>
                <button className={form.buttonSecondary} type="button" onClick={onNotApplicable} disabled={busy}>
                  Mark as not applicable…
                </button>
                <button className={form.button} type="button" onClick={onComplete} disabled={busy || unresolved > 0 || blocker !== ""}>
                  {busy ? "Completing…" : `Complete stage ${stage.stage}`}
                </button>
              </>
            ) : (
              <button className={form.buttonSecondary} type="button" onClick={onReopen} disabled={busy}>
                Reopen stage {stage.stage}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
