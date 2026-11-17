// Connects a stored case to the pure reconciliation engine. The engine itself never touches the database.
// Stage 1: pre-admission list → discharge list.  Stage 2: discharge list → first new prescription (D-010).
import type { CaseDetail, ComparedMedicine, Medicine, ReconciliationLine } from "@dischargeiq/shared";
import { reconcile } from "./reconcile.service";
import { sourceIsInLetter } from "./ai.service";

function toCompared(medicine: Medicine, letterText: string | null): ComparedMedicine {
  return {
    id: medicine.id,
    name: medicine.name,
    strength: medicine.strength,
    form: medicine.form,
    dose: medicine.dose,
    frequency: medicine.frequency,
    route: medicine.route,
    letterStatus: medicine.letterStatus,
    sourceText: medicine.sourceText,
    aiConfidence: medicine.aiConfidence,
    // The hallucination check runs every time, against the letter as it is now.
    sourceFound: sourceIsInLetter(medicine.sourceText, letterText),
  };
}

export function compareCase(detail: CaseDetail, stage: 1 | 2): ReconciliationLine[] {
  const list = (type: Medicine["listType"]): ComparedMedicine[] =>
    detail.medicines.filter((m) => m.listType === type).map((m) => toCompared(m, detail.letterText));

  if (stage === 1) {
    return reconcile(list("pre_admission"), list("discharge"));
  }
  // Stage 2 starts from what the patient should be taking now: the discharge list minus anything stopped/withheld.
  const stillTaking = list("discharge").filter((m) => m.letterStatus !== "stopped" && m.letterStatus !== "withheld");
  return reconcile(stillTaking, list("new_prescription"), {
    beforeListName: "discharge list",
    afterListName: "new prescription",
    flagEveryDifference: true,
  });
}
