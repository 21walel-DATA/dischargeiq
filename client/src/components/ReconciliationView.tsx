// The comparison view (docs/designs/case-detail-desktop.png): before on the left, what changed in the middle,
// after on the right. Every line shows its category as word + shape + colour. "Needs review" lines show the reason
// in highlighter yellow and a "Checked by" box; once initialled they switch to the calm resolved style (D-032, D-036).
// High-risk medicines get the band on both sides (D-044).
import { Fragment, type ReactElement } from "react";
import { Link } from "react-router";
import type { Acknowledgement, ReconciliationLine } from "@dischargeiq/shared";
import { EmptyLabel, MedicineLabel, type LabelLook } from "./MedicineLabel";
import { StatusMark, statusStyles } from "./StatusMark";
import styles from "./Recon.module.css";

type Props = {
  lines: ReconciliationLine[];
  beforeTitle: string; // "Before admission (PMR)"
  afterTitle: string; // "On discharge (letter)"
  medicineLink: (medicineId: string) => string; // address of the medicine detail page
  acknowledgements?: Acknowledgement[]; // "Checked by" records for this stage
  onCheck?: (line: ReconciliationLine) => void; // missing = read-only (demo, completed or claimed)
  onUncheck?: (line: ReconciliationLine) => void;
};

function looks(line: ReconciliationLine, checked: boolean): { before: LabelLook; after: LabelLook } {
  if (line.needsReview) return checked ? { before: "resolved", after: "resolved" } : { before: "review", after: "review" };
  if (line.changeType === "stopped") return { before: "stopped", after: "plain" };
  if (line.changeType === "started") return { before: "plain", after: "started" };
  if (line.changeType === "changed") return { before: "plain", after: "changed" };
  return { before: "muted", after: "muted" };
}

// Lines that still need the pharmacist: flagged and not yet initialled. The legend and the action bar both use this.
export function unresolvedLines(lines: ReconciliationLine[], acknowledgements: Acknowledgement[]): ReconciliationLine[] {
  const checked = new Set(acknowledgements.map((a) => a.key));
  return lines.filter((line) => line.needsReview && !checked.has(line.key));
}

export function ComparisonCounts({ lines, unresolved }: { lines: ReconciliationLine[]; unresolved: number }) {
  const count = (type: ReconciliationLine["changeType"]): number => lines.filter((l) => l.changeType === type).length;
  return (
    <div className={statusStyles.counts}>
      <StatusMark kind="changed" text={`${count("changed")} changed`} />
      <StatusMark kind="stopped" text={`${count("stopped")} stopped`} />
      <StatusMark kind="started" text={`${count("started")} started`} />
      <StatusMark kind="review" text={`${unresolved} need${unresolved === 1 ? "s" : ""} review`} />
      <StatusMark kind="unchanged" text={`${count("unchanged")} unchanged`} />
    </div>
  );
}

// "Strength 5 mg → 10 mg" → "Strength", old value struck through, new value bold on a violet tint (design-system.md).
function ChangeDetail({ text }: { text: string }): ReactElement {
  const match = /^(\S+) (.+) → (.+)$/.exec(text);
  if (!match) return <span>{text}</span>;
  return (
    <span>
      {match[1]} <span className={styles.was}>{match[2]}</span> <span className={styles.now}>{match[3]}</span>
    </span>
  );
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// The signature element: "Checked by" + a box for the pharmacist's initials.
function CheckedBy({ line, ack, onCheck, onUncheck }: { line: ReconciliationLine; ack?: Acknowledgement; onCheck?: Props["onCheck"]; onUncheck?: Props["onUncheck"] }) {
  const name = (line.to ?? line.from)?.name ?? "this line";
  if (ack) {
    return (
      <span className={styles.checkedBy}>
        Checked by
        <span className={styles.box} title={ack.byName}>
          {ack.byInitials}
        </span>
        <span className={`${styles.time} num`}>{time(ack.at)}</span>
        {onUncheck && (
          <button className={styles.undo} type="button" onClick={() => onUncheck(line)}>
            Undo<span className="visually-hidden"> check of {name}</span>
          </button>
        )}
      </span>
    );
  }
  if (!onCheck) return <></>;
  return (
    <span className={styles.checkedBy}>
      Checked by
      <button className={`${styles.box} ${styles.boxEmpty}`} type="button" onClick={() => onCheck(line)} aria-label={`Check ${name}: add your initials`} />
      <span className={styles.required}>Required</span>
    </span>
  );
}

export function ReconciliationView({ lines, beforeTitle, afterTitle, medicineLink, acknowledgements = [], onCheck, onUncheck }: Props) {
  const byKey = new Map(acknowledgements.map((a) => [a.key, a]));
  return (
    <>
      <div className={styles.head} aria-hidden="true">
        <span>{beforeTitle}</span>
        <span>Change</span>
        <span>{afterTitle}</span>
      </div>
      <ol className={styles.list} aria-label="Medicines compared">
        {lines.map((line) => {
          const ack = byKey.get(line.key);
          const look = looks(line, ack !== undefined);
          // A letter line that only says "stopped" or "withheld" is quoted in the middle, not shown as a medicine.
          const afterIsLetterStop = line.to !== null && (line.to.letterStatus === "stopped" || line.to.letterStatus === "withheld");
          const linkId = line.from?.id ?? line.to?.id;
          const link = linkId ? medicineLink(linkId) : undefined;
          return (
            <li className={styles.row} key={line.key}>
              <div>
                <div className={styles.sideTag}>{beforeTitle}</div>
                {line.from ? (
                  <MedicineLabel medicine={line.from} look={look.before} highRiskReason={line.highRiskReason} to={link} />
                ) : (
                  <EmptyLabel text="Not on this list" />
                )}
              </div>

              <div className={styles.status}>
                <StatusMark kind={line.changeType} />
                {line.changeDetails.map((detail) => (
                  <span className={`${styles.detail} num`} key={detail}>
                    <ChangeDetail text={detail} />
                  </span>
                ))}
                {line.timingNote && <span className={styles.quote}>{line.timingNote}</span>}
                {line.needsReview && !ack && (
                  <>
                    <StatusMark kind="review" />
                    {line.reviewReasons.map((reason) => (
                      <span className={styles.detail} key={reason}>
                        <span className={styles.highlight}>{reason}</span>
                      </span>
                    ))}
                  </>
                )}
                {line.needsReview && ack && (
                  <>
                    <StatusMark kind="resolved" text={`Checked${ack.note ? `: ${ack.note}` : ""}`} />
                    {line.reviewReasons.map((reason) => (
                      <Fragment key={reason}>
                        <span className={styles.quote}>{reason}</span>
                      </Fragment>
                    ))}
                  </>
                )}
                {line.needsReview && <CheckedBy line={line} ack={ack} onCheck={onCheck} onUncheck={onUncheck} />}
                {line.sourceText && <span className={styles.quote}>“{line.sourceText}”</span>}
                {link && (
                  <span className={styles.detail}>
                    <Link to={link}>See the letter sentence and details</Link>
                  </span>
                )}
              </div>

              <div>
                <div className={styles.sideTag}>{afterTitle}</div>
                {line.to && !afterIsLetterStop ? (
                  <MedicineLabel medicine={line.to} look={look.after} highRiskReason={line.highRiskReason} to={link} />
                ) : (
                  <EmptyLabel text={afterIsLetterStop ? `Not on the list: the letter says ${line.to?.letterStatus}` : "Not on this list"} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
