// Upload a PDF or photo of the discharge letter (D-054). The AI copies it out as TEXT ONLY; the case form then
// shows the file beside the text so the pharmacist can check it before saving and reading it.
import { useId, useState } from "react";
import { MAX_UPLOAD_BYTES, type AiMode } from "@dischargeiq/shared";
import { transcribeLetter } from "../api/cases";
import form from "./Form.module.css";
import page from "./Page.module.css";
import styles from "./LetterUpload.module.css";

// What the case form needs back: the text to check, and the file to show beside it.
export type Transcribed = { letterText: string; previewUrl: string; isPdf: boolean };

const MAX_EDGE = 2000; // pixels: plenty to read a printed letter, and keeps the upload small

// Photos straight from a phone are large (and may be HEIC on an iPhone). Redraw them as a JPEG no bigger than
// MAX_EDGE. Redrawing also drops the photo's hidden details (EXIF), such as where it was taken.
// Small PNG/JPEG files are sent unchanged, so the demo sample files keep their fingerprint.
async function prepareImage(file: File): Promise<Blob> {
  const small = file.size <= 1.5 * 1024 * 1024 && (file.type === "image/png" || file.type === "image/jpeg");
  const bitmap = await createImageBitmap(file);
  if (small && Math.max(bitmap.width, bitmap.height) <= MAX_EDGE) {
    bitmap.close();
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't redraw the photo"))), "image/jpeg", 0.85);
  });
}

export function LetterUpload({
  caseId,
  aiMode,
  hasText,
  onTranscribed,
}: {
  caseId: string;
  aiMode: AiMode | null;
  hasText: boolean;
  onTranscribed: (result: Transcribed) => void;
}) {
  const ids = useId();
  const [file, setFile] = useState<File | null>(null);
  const [synthetic, setSynthetic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inputKey, setInputKey] = useState(0);

  // A plain button, not a <form>: this sits inside the case form, and forms can't be nested.
  async function handleUpload(): Promise<void> {
    setError("");
    if (!file) {
      setError("Choose a PDF or photo of the letter first.");
      return;
    }
    if (!synthetic) {
      setError("Tick the box to confirm this is a synthetic letter, not a real patient's.");
      return;
    }
    const isPdf = file.type === "application/pdf";
    if (!isPdf && !file.type.startsWith("image/")) {
      setError("Upload a PDF, PNG or JPEG of the letter.");
      return;
    }
    setBusy(true);
    let toSend: Blob;
    try {
      toSend = isPdf ? file : await prepareImage(file);
    } catch {
      setBusy(false);
      setError("This photo couldn't be opened. Use a JPEG or PNG, or the PDF.");
      return;
    }
    if (toSend.size > MAX_UPLOAD_BYTES) {
      setBusy(false);
      setError("This file is over 4 MB. Use a smaller PDF, or a photo of the letter instead.");
      return;
    }
    const result = await transcribeLetter(caseId, toSend);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onTranscribed({ letterText: result.letterText, previewUrl: URL.createObjectURL(toSend), isPdf });
    setFile(null);
    setSynthetic(false);
    setInputKey(inputKey + 1); // a new key gives a fresh, empty file box
  }

  return (
    <div className={styles.upload} role="group" aria-labelledby={`${ids}-title`}>
      <h3 id={`${ids}-title`} className={styles.title}>
        Or upload the letter
      </h3>
      <p className={`${page.small} ${page.muted}`}>
        A PDF or a photo, up to 4 MB. The letter is copied out as text for you to check{hasText ? ", replacing the text above" : ""}.
        The file is not kept.
      </p>
      {aiMode === "mock" && (
        <p className={page.small}>
          <span className={page.demoMode}>Demo mode</span> reads the sample files only: download the{" "}
          <a href="/demo-letters/dms-0042-letter.pdf" download>
            sample PDF
          </a>{" "}
          or the{" "}
          <a href="/demo-letters/dms-0042-letter-photo.jpg" download>
            sample photo
          </a>{" "}
          of DMS-0042, then upload it.
        </p>
      )}

      {error && (
        <div className={form.alert} role="alert">
          <strong>{error}</strong>
        </div>
      )}

      <div className={form.field}>
        <label className={form.label} htmlFor={`${ids}-file`}>
          Letter file
        </label>
        <input
          key={inputKey}
          className={`${form.input} ${styles.file}`}
          id={`${ids}-file`}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>
      <label className={form.check}>
        <input type="checkbox" checked={synthetic} onChange={(event) => setSynthetic(event.target.checked)} />
        <span>
          <strong>This is a synthetic demo letter,</strong> not a real patient&apos;s. Real letters must not be uploaded to
          this prototype.
        </span>
      </label>
      <div className={page.btnRow}>
        <button className={form.buttonSecondary} type="button" onClick={handleUpload} disabled={busy}>
          {busy ? "Copying out the letter…" : "Upload and copy out"}
        </button>
      </div>
      <p className={styles.live} role="status">
        {busy ? "Copying out the letter. This can take up to a minute." : ""}
      </p>
    </div>
  );
}
