// The one place errors are turned into responses (golden rule 13).
// Users get a short friendly message and a status code; the details go only to the server log.
import type { NextFunction, Request, Response } from "express";

// A small shape we can safely read from any error object.
type ErrorWithStatus = { status?: number; type?: string };

// Express recognises an error handler by its four parameters, so `_next` must stay even though it's unused.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(error);

  const details = (typeof error === "object" && error !== null ? error : {}) as ErrorWithStatus;

  // Broken JSON sent by the browser: the user's request is at fault, so 400.
  if (details.type === "entity.parse.failed") {
    res.status(400).json({ error: "The request couldn't be read. Refresh the page and try again." });
    return;
  }
  if (details.type === "entity.too.large") {
    res.status(413).json({ error: "That's too much to send at once. Use shorter text or a file under 4 MB." });
    return;
  }

  res.status(500).json({ error: "Something went wrong on our side. Try again in a moment." });
}
