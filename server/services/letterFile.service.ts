// Checks an uploaded letter file (D-054) BEFORE it goes anywhere: what kind of file it really is, and whether the
// transcribed text is safe to hand back. Plain functions, no AI, so they are easy to unit-test.
import { createHash } from "node:crypto";
import { containsRealNhsNumber, countUnclear, transcriptionSchema } from "@dischargeiq/shared";

export type LetterFileKind = "pdf" | "png" | "jpeg";

// The browser's label (Content-Type) can be faked, so we look at the file's first bytes ("magic numbers"):
// every PDF starts with "%PDF-", every PNG with the same 8 bytes, every JPEG with FF D8 FF.
export function detectLetterFile(bytes: Buffer): LetterFileKind | null {
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  return null;
}

// A file's SHA-256 fingerprint: the same bytes always give the same 64-character code. Demo mode uses it to
// recognise the synthetic sample letter files.
export function fingerprint(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type TranscriptCheck =
  | { ok: true; letterText: string; unclearCount: number }
  | { ok: false; reason: "unreadable" | "realNhsNumber" };

// Golden rule 5 + the NHS number guard (D-030) on whatever the AI (or the mock) produced.
// A transcript with a real NHS number is thrown away here, before it is sent back or saved anywhere.
export function checkTranscript(answer: unknown): TranscriptCheck {
  const parsed = transcriptionSchema.safeParse(answer);
  if (!parsed.success) {
    return { ok: false, reason: "unreadable" };
  }
  const text = parsed.data.letter_text;
  // Nothing but [unclear] markers (e.g. a photo of something that isn't a letter): nothing worth checking.
  if (text.replace(/\[\s*unclear\s*\]/gi, "").trim() === "") {
    return { ok: false, reason: "unreadable" };
  }
  if (containsRealNhsNumber(text)) {
    return { ok: false, reason: "realNhsNumber" };
  }
  return { ok: true, letterText: text, unclearCount: countUnclear(text) };
}
