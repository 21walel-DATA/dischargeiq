// The one place errors are turned into responses (golden rule 13).
// Users get a short friendly message and a status code; the details go only to the server log.
import type { NextFunction, Request, Response } from "express";
import { errorCode } from "../services/logSafe";

// A small shape we can safely read from any error object.
type ErrorWithStatus = { status?: number; type?: string };

// Express recognises an error handler by its four parameters, so `_next` must stay even though it's unused.
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const details = (typeof error === "object" && error !== null ? error : {}) as ErrorWithStatus;

  // Broken JSON sent by the browser: the user's request is at fault, so 400. Logged by type only: this error
  // carries the raw request body (it could be a password), and its message quotes it.
  if (details.type === "entity.parse.failed") {
    console.error(`Bad request body on ${req.method} ${req.path} (entity.parse.failed)`);
    res.status(400).json({ error: "The request couldn't be read. Refresh the page and try again." });
    return;
  }
  if (details.type === "entity.too.large") {
    console.error(`Request too large on ${req.method} ${req.path}`);
    res.status(413).json({ error: "That's too much to send at once. Use shorter text or a file under 4 MB." });
    return;
  }

  // Anything else is our bug or a database problem. The log gets the error's name, code and where it happened
  // (the stack frames), but not its message or detail, which can quote request values (logSafe.ts).
  const frames = error instanceof Error && error.stack ? error.stack.split("\n").slice(1, 6).join("\n") : "";
  console.error(`Unhandled error on ${req.method} ${req.path} (${errorCode(error)})\n${frames}`);
  res.status(500).json({ error: "Something went wrong on our side. Try again in a moment." });
}
