// The comparison view (docs/designs/case-detail-desktop.png): before on the left, what changed in the middle,
// after on the right. Every line shows its category as word + shape + colour; "Needs review" lines show the reason
// in highlighter yellow (D-032); high-risk medicines get the band on both sides (D-044).
import { Link } from "react-router";
import type { ReconciliationLine } from "@dischargeiq/shared";
import { EmptyLabel, MedicineLabel, type LabelLook } from "./MedicineLabel";
import { StatusMark, statusStyles } from "./StatusMark";
import styles from "./Recon.module.css";

type Props = {
  lines: ReconciliationLine[];
  beforeTitle: string; // "Before admission (PMR)"
  afterTitle: string; // "On discharge (letter)"
  medicineLink: (medicineId: string) => string; // address of the medicine detail page
};

function looks(line: ReconciliationLine): { before: LabelLook; after: LabelLook } {
  if (line.needsReview) return { before: "review", after: "review" };
  if (line.changeType === "stopped") return { before: "stopped", after: "plain" };
  if (line.changeType === "started") return { before: "plain", after: "started" };
  if (line.changeType === "changed") return { before: "plain", after: "changed" };
  return { before: "muted", after: "muted" };
}

export function ComparisonCounts({ lines }: { lines: ReconciliationLine[] }) {
  const count = (type: ReconciliationLine["changeType"]): number => lines.filter((l) => l.changeType === type).length;
  const review = lines.filter((l) => l.needsReview).length;
  return (
    <div className={`${statusStyles.counts}`}>
      <StatusMark kind="changed" text={`${count("changed")} changed`} />
      <StatusMark kind="stopped" text={`${count("stopped")} stopped`} />
      <StatusMark kind="started" text={`${count("started")} started`} />
      <StatusMark kind="review" text={`${review} need${review === 1 ? "s" : ""} review`} />
      <StatusMark kind="unchanged" text={`${count("unchanged")} unchanged`} />
    </div>
  );
}

export function ReconciliationView({ lines, beforeTitle, afterTitle, medicineLink }: Props) {
  return (
    <>
      <div className={styles.head} aria-hidden="true">
        <span>{beforeTitle}</span>
        <span>Change</span>
        <span>{afterTitle}</span>
      </div>
      <ol className={styles.list} aria-label="Medicines compared">
        {lines.map((line) => {
          const look = looks(line);
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
                    {detail}
                  </span>
                ))}
                {line.timingNote && <span className={styles.quote}>{line.timingNote}</span>}
                {line.needsReview && (
                  <>
                    <StatusMark kind="review" />
                    {line.reviewReasons.map((reason) => (
                      <span className={styles.detail} key={reason}>
                        <span className={styles.highlight}>{reason}</span>
                      </span>
                    ))}
                  </>
                )}
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
