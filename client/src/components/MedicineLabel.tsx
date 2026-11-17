// One medicine drawn as a dispensing label (design-system.md, D-033). Used on both sides of the comparison.
import { Link } from "react-router";
import type { ComparedMedicine } from "@dischargeiq/shared";
import { directions } from "../format";
import styles from "./Label.module.css";

export type LabelLook = "plain" | "started" | "stopped" | "changed" | "muted" | "review";

type Props = {
  medicine: ComparedMedicine;
  look: LabelLook;
  highRiskReason: string | null; // e.g. "High-risk medicine (Anticoagulant)"
  to?: string; // where clicking the label goes (the medicine detail page)
};

const LOOK_CLASS: Record<LabelLook, string> = {
  plain: "",
  started: styles.bandStarted,
  stopped: `${styles.bandStopped} ${styles.struck}`,
  changed: styles.bandChanged,
  muted: styles.muted,
  review: styles.review,
};

export function MedicineLabel({ medicine, look, highRiskReason, to }: Props) {
  const lineTwo = directions(medicine.dose, medicine.frequency);
  const lineThree = [medicine.form, medicine.route].filter(Boolean).join(", ");
  const content = (
    <>
      {highRiskReason && (
        <div className={styles.highrisk}>
          <span className={styles.octagon} aria-hidden="true">
            !
          </span>
          {highRiskReason}
        </div>
      )}
      <div className={styles.line1}>
        <span className={styles.name}>{medicine.name}</span>
        {medicine.strength && <span className={`${styles.strength} num`}>{medicine.strength}</span>}
      </div>
      {lineTwo && <div className={styles.directions}>{lineTwo}</div>}
      {lineThree && <div className={styles.form}>{lineThree}</div>}
      {medicine.letterStatus && (medicine.letterStatus === "stopped" || medicine.letterStatus === "withheld") && (
        <div className={styles.letterNote}>
          Letter says: <strong>{medicine.letterStatus}</strong>
        </div>
      )}
    </>
  );
  const className = `${styles.label} ${LOOK_CLASS[look]}`;
  return to ? (
    <Link className={className} to={to}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function EmptyLabel({ text }: { text: string }) {
  return <div className={`${styles.label} ${styles.empty}`}>{text}</div>;
}
