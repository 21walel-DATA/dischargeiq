import type { Request, Response } from "express";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "We couldn't find that. Check the address and try again." });
}
