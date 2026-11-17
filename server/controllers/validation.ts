// Turns a failed Zod check into the friendly 400 answer every form understands:
// { error: "Check the details you entered.", fields: { fieldName: "first message for that field" } }.
// The messages are our own wording from the shared schemas, never library internals (golden rule 13).
import type { Response } from "express";
import type { z } from "zod";

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!(field in result)) {
      result[field] = issue.message;
    }
  }
  return result;
}

export function sendValidationError(res: Response, error: z.ZodError): void {
  res.status(400).json({ error: "Check the details you entered.", fields: fieldErrors(error) });
}
