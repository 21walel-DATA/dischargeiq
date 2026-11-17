// One of a case's three medicine lists, with "add a medicine" and "delete" (docs/designs/case-form-desktop.png).
// Editing an existing medicine happens on its own page (the medicine detail page).
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { medicineCreateSchema, type ListType, type Medicine } from "@dischargeiq/shared";
import { addMedicine, deleteMedicine } from "../api/cases";
import { directions } from "../format";
import form from "./Form.module.css";
import page from "./Page.module.css";
import styles from "./MedicineListEditor.module.css";

type Props = {
  caseId: string;
  listType: ListType;
  title: string;
  hint: string;
  medicines: Medicine[];
  onChanged: () => void; // asks the page to reload the case after a change
};

const EMPTY = { name: "", strength: "", dose: "", frequency: "" };

// The four boxes in the "add a medicine" row, in order.
const INPUTS: { key: "name" | "strength" | "dose" | "frequency"; label: string; example: string }[] = [
  { key: "name", label: "Medicine", example: "e.g. Amlodipine" },
  { key: "strength", label: "Strength", example: "e.g. 5 mg" },
  { key: "dose", label: "Dose", example: "e.g. one tablet" },
  { key: "frequency", label: "How often", example: "e.g. each morning" },
];

export function MedicineListEditor({ caseId, listType, title, hint, medicines, onChanged }: Props) {
  const [draft, setDraft] = useState(EMPTY);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const idPrefix = `${listType}-new`;

  async function handleAdd(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage("");
    const details = { listType, ...draft };
    const check = medicineCreateSchema.safeParse(details);
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
    const result = await addMedicine(caseId, details);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      setFields(result.fields);
      return;
    }
    setDraft(EMPTY);
    setFields({});
    onChanged();
  }

  async function handleDelete(medicine: Medicine): Promise<void> {
    const result = await deleteMedicine(medicine.id);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onChanged();
  }

  return (
    <section className={page.panel} aria-labelledby={`${listType}-title`}>
      <h2 id={`${listType}-title`}>{title}</h2>
      <p className={page.muted}>{hint}</p>

      {medicines.length === 0 ? (
        <p className={`${page.small} ${page.muted}`}>No medicines on this list yet.</p>
      ) : (
        <ul className={styles.list}>
          {medicines.map((m) => (
            <li className={styles.item} key={m.id}>
              <div>
                <Link to={`/cases/${caseId}/medicines/${m.id}`}>
                  <strong>{m.name}</strong>
                </Link>{" "}
                {m.strength && <span className="num">{m.strength}</span>}
                <div className={page.small}>{directions(m.dose, m.frequency) || <span className={page.muted}>No directions</span>}</div>
                {m.sourceText && <div className={`${page.small} ${page.muted}`}>From the letter: “{m.sourceText}”</div>}
              </div>
              <button className={`${form.buttonSecondary} ${form.buttonSmall}`} type="button" onClick={() => handleDelete(m)}>
                Delete {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <div className={form.alert} role="alert">
          {message}
        </div>
      )}

      <form className={styles.add} onSubmit={handleAdd} noValidate aria-label={`Add a medicine to ${title.toLowerCase()}`}>
        {INPUTS.map(({ key, label, example }) => (
          <div className={form.field} key={key}>
            <label className={form.label} htmlFor={`${idPrefix}-${key}`}>
              {label}
            </label>
            <input
              className={`${form.input} ${key === "strength" ? "num" : ""}`}
              id={`${idPrefix}-${key}`}
              placeholder={example}
              value={draft[key]}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
              aria-invalid={fields[key] ? true : undefined}
              aria-describedby={fields[key] ? `${idPrefix}-${key}-error` : undefined}
            />
            {fields[key] && (
              <span className={form.error} id={`${idPrefix}-${key}-error`}>
                <span className={form.errorMark} aria-hidden="true">
                  !
                </span>
                {fields[key]}
              </span>
            )}
          </div>
        ))}
        <button className={form.buttonSecondary} type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add medicine"}
        </button>
      </form>
    </section>
  );
}
