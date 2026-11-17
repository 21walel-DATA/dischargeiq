import { z } from "zod";
import { aiModeSchema } from "./extraction";

// Letter upload (D-054): a PDF or photo of the letter is turned into TEXT ONLY. The pharmacist checks that text, saves
// it like a pasted letter (NHS number guard), and only then reads it with the normal letter reader.

// Upload rules, shared so the page can check before sending. 4 MB stays under the size Vercel forwards to the API.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const UPLOAD_MEDIA_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

// What the AI writes wherever it can't read the letter. Reading is blocked until none are left.
export const UNCLEAR_MARKER = "[unclear]";

// How many [unclear] markers are left (any capital letters, spaces inside the brackets allowed).
export function countUnclear(text: string): number {
  return text.match(/\[\s*unclear\s*\]/gi)?.length ?? 0;
}

// The ONLY shape we accept from the AI for a transcription (golden rule 5). Same 20,000-character limit as a pasted
// letter. snake_case because that's the name the AI is asked to use.
export const transcriptionSchema = z.object({
  letter_text: z.string().trim().min(1).max(20000),
});
export type Transcription = z.infer<typeof transcriptionSchema>;

// What POST /api/cases/:id/transcribe sends back. The text is NOT saved: it goes into the letter box for checking.
export const transcribeResponseSchema = z.object({
  mode: aiModeSchema,
  letterText: z.string(),
  unclearCount: z.number(),
});
export type TranscribeResponse = z.infer<typeof transcribeResponseSchema>;
