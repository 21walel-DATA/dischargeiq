// Handles the four auth requests: check the input, call the service, set or clear the cookie, reply.
import type { Request, Response } from "express";
import { z } from "zod";
import { loginRequestSchema, registerRequestSchema, type AuthResponse } from "@dischargeiq/shared";
import { findUserById, registerUser, verifyLogin } from "../services/auth.service";
import { SESSION_COOKIE, sessionCookieOptions, signSessionToken } from "../services/session.service";
import { getCurrentUser } from "../middleware/requireAuth";

// Turns Zod's result into { field: "first message" } so the form can show each message under its field.
// The messages are our own wording from shared/src/auth.ts, never library internals.
function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!(field in result)) {
      result[field] = issue.message;
    }
  }
  return result;
}

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the details you entered.", fields: fieldErrors(parsed.error) });
    return;
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) {
    res.status(409).json({
      error: "An account with this email already exists. Log in instead.",
      fields: { email: "This email already has an account." },
    });
    return;
  }

  // Registering also logs you in.
  res.cookie(SESSION_COOKIE, signSessionToken(result.user), sessionCookieOptions());
  const body: AuthResponse = { user: result.user };
  res.status(201).json(body);
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the details you entered.", fields: fieldErrors(parsed.error) });
    return;
  }

  const user = await verifyLogin(parsed.data);
  if (!user) {
    // The same message whether the email or the password was wrong, so nobody can test which emails exist.
    res.status(401).json({ error: "Email or password is incorrect. Check both and try again." });
    return;
  }

  res.cookie(SESSION_COOKIE, signSessionToken(user), sessionCookieOptions());
  const body: AuthResponse = { user };
  res.status(200).json(body);
}

export function logout(_req: Request, res: Response): void {
  // To delete a cookie the browser needs the same options it was set with. Express 5 ignores maxAge here
  // and sends an expiry date in 1970, which makes the browser drop the cookie.
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.status(204).end();
}

export async function me(_req: Request, res: Response): Promise<void> {
  // Look the user up again rather than trusting the token alone: a deleted account stops working at once.
  const user = await findUserById(getCurrentUser(res).id);
  if (!user) {
    res.status(401).json({ error: "Log in to continue." });
    return;
  }
  const body: AuthResponse = { user };
  res.status(200).json(body);
}
