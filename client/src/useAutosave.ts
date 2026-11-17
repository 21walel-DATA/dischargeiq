// Autosave (D-021): saves 800 ms after the pharmacist stops typing, and straight away when they leave the box.
// Shows "Saving…", "Saved 10:42" or "Couldn't save. Retry", and warns before leaving the page with unsaved changes.
// Last write wins: there's no locking, which is fine for one pharmacist per case.
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

const DELAY_MS = 800;

// `save` sends the text to the server and says whether it worked.
export function useAutosave(save: (text: string) => Promise<boolean>): {
  state: SaveState;
  savedAt: Date | null;
  change: (text: string) => void;
  flush: () => Promise<void>;
} {
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  // useRef keeps a value between renders without causing a re-render: the text waiting to be saved, and the timer.
  const waiting = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    const text = waiting.current;
    if (text === null) return;
    waiting.current = null;
    setState("saving");
    if (await save(text)) {
      setState(waiting.current === null ? "saved" : "unsaved");
      setSavedAt(new Date());
    } else {
      waiting.current = waiting.current ?? text; // keep it, so "Retry" can send it again
      setState("error");
    }
  }, [save]);

  const change = useCallback(
    (text: string): void => {
      waiting.current = text;
      setState("unsaved");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        void flush();
      }, DELAY_MS);
    },
    [flush],
  );

  // The browser's own "Leave site? Changes you made may not be saved." warning.
  useEffect(() => {
    function warn(event: BeforeUnloadEvent): void {
      if (waiting.current !== null) event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return { state, savedAt, change, flush };
}

export function describeSaveState(state: SaveState, savedAt: Date | null): string {
  if (state === "saving") return "Saving…";
  if (state === "unsaved") return "Not saved yet";
  if (state === "error") return "Couldn't save.";
  if (state === "saved" && savedAt) {
    return `Saved ${savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return "";
}
