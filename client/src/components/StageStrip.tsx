// The three DMS stages. A real sequence, so the numbers mean something (design-system.md).
// On a case page they are buttons that switch between stages; each says its state in words.
import type { DmsStage } from "@dischargeiq/shared";
import page from "./Page.module.css";

export const STAGE_TITLES: Record<number, string> = {
  1: "Review discharge information",
  2: "Check first new prescription",
  3: "Consultation with patient or carer",
};

const STATE_WORDS: Record<DmsStage["status"], string> = {
  pending: "Not completed",
  completed: "Completed",
  not_applicable: "Not applicable",
};

function stateInWords(stage: Pick<DmsStage, "status" | "completedAt" | "notApplicableReason">, isCurrent: boolean): string {
  if (stage.status === "completed" && stage.completedAt) {
    const date = new Date(stage.completedAt);
    return `Completed ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (stage.status === "not_applicable") return `Not applicable: ${stage.notApplicableReason ?? ""}`;
  return isCurrent ? "In progress" : "Not started";
}

type StripProps = {
  stages: DmsStage[];
  active: number; // the stage shown below
  onSelect: (stage: 1 | 2 | 3) => void;
};

export function StageStrip({ stages, active, onSelect }: StripProps) {
  // The first stage still pending is the one in progress.
  const current = stages.find((s) => s.status === "pending")?.stage;
  return (
    <ol className={page.stages} aria-label="DMS stages">
      {stages.map((s) => (
        <li key={s.stage}>
          <button
            type="button"
            className={`${page.stage} ${s.status === "completed" ? page.stageDone : ""} ${s.stage === active ? page.stageCurrent : ""}`}
            aria-pressed={s.stage === active}
            onClick={() => onSelect(s.stage === 2 ? 2 : s.stage === 3 ? 3 : 1)}
          >
            <span className={page.stageNum}>{s.status === "completed" ? "✓" : s.stage}</span>
            <span className={page.stageTitle}>
              <span className="visually-hidden">Stage {s.stage}: </span>
              {STAGE_TITLES[s.stage]}
            </span>
            <span className={page.stageState}>{stateInWords(s, s.stage === current)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// Small pips for the cases table: filled = completed, empty = not done, dashed = not applicable.
export function StagePips({ stages }: { stages: Pick<DmsStage, "stage" | "status">[] }) {
  const summary = stages.map((s) => `stage ${s.stage} ${STATE_WORDS[s.status].toLowerCase()}`).join(", ");
  return (
    <span className={page.pips} role="img" aria-label={summary}>
      {stages.map((s) => (
        <span
          key={s.stage}
          className={`${page.pip} ${s.status === "completed" ? page.pipDone : ""} ${s.status === "not_applicable" ? page.pipNa : ""}`}
        >
          {s.stage}
        </span>
      ))}
    </span>
  );
}
