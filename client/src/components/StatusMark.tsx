// A clinical status as word + shape + colour (design-system.md): readable in greyscale and by screen readers.
import type { ChangeType } from "@dischargeiq/shared";
import styles from "./Status.module.css";

// "review" isn't a category (D-032); it's the "Needs review" flag, shown with the same kind of mark.
export type StatusKind = ChangeType | "review" | "resolved";

const LOOK: Record<StatusKind, { shape: string; word: string; className: string }> = {
  started: { shape: "+", word: "Started", className: styles.started },
  stopped: { shape: "×", word: "Stopped", className: styles.stopped },
  changed: { shape: "Δ", word: "Changed", className: styles.changed },
  unchanged: { shape: "=", word: "Unchanged", className: styles.unchanged },
  review: { shape: "?", word: "Needs review", className: styles.review },
  resolved: { shape: "✓", word: "Checked", className: styles.resolved },
};

// `text` replaces the default word, e.g. "2 need review" in the counts row.
export function StatusMark({ kind, text }: { kind: StatusKind; text?: string }) {
  const look = LOOK[kind];
  return (
    <span className={`${styles.status} ${look.className}`}>
      <span className={styles.mark} aria-hidden="true">
        {look.shape}
      </span>
      {text ?? look.word}
    </span>
  );
}

export const statusStyles = styles;
