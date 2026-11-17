// The three DMS stages for a case (read-only for now; completing stages arrives in Phase 3).
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

export function StageStrip({ stages }: { stages: Pick<DmsStage, "stage" | "status">[] }) {
  // The first stage still pending is the one to work on now.
  const current = stages.find((s) => s.status === "pending")?.stage;
  return (
    <ol className={page.stages} aria-label="DMS stages">
      {stages.map((s) => (
        <li
          key={s.stage}
          className={`${page.stage} ${s.status === "completed" ? page.stageDone : ""} ${s.stage === current ? page.stageCurrent : ""}`}
          aria-current={s.stage === current ? "step" : undefined}
        >
          <span className={page.stageNum}>{s.stage}</span>
          <span className={page.stageTitle}>{STAGE_TITLES[s.stage]}</span>
          <span className={page.stageState}>{STATE_WORDS[s.status]}</span>
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
