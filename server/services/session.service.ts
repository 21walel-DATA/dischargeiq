// The login "session": a signed token (JWT) stored in a cookie the browser's JavaScript can't read.
// The token says WHO you are (user id) and your role. It is signed with JWT_SECRET, so it can't be forged
// or edited without the server noticing. It is not encrypted, so it holds nothing private.
import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";
import { z } from "zod";

export const SESSION_COOKIE = "diq_session";
const SESSION_HOURS = 8; // about one pharmacy shift, then log in again

// What we keep about the logged-in user while handling a request.
export const authUserSchema = z.object({
  id: z.uuid(),
  role: z.enum(["pharmacist", "admin"]),
});
export type AuthUser = z.infer<typeof authUserSchema>;

// The token's contents: "sub" (subject) is the standard JWT name for the user id.
const tokenPayloadSchema = z.object({
  sub: z.uuid(),
  role: z.enum(["pharmacist", "admin"]),
});

// Read the secret only when needed and refuse a missing or weak one. The value is never logged.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or shorter than 32 characters");
  }
  return secret;
}

export function signSessionToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, getJwtSecret(), {
    subject: user.id,
    algorithm: "HS256",
    expiresIn: `${SESSION_HOURS}h`,
  });
}

// Returns the user, or null if the token is missing, expired, tampered with or malformed.
export function verifySessionToken(token: unknown): AuthUser | null {
  if (typeof token !== "string" || token === "") {
    return null;
  }
  try {
    // Only HS256 is accepted, which blocks the classic "alg: none" trick.
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    const payload = tokenPayloadSchema.safeParse(decoded);
    return payload.success ? { id: payload.data.sub, role: payload.data.role } : null;
  } catch {
    return null;
  }
}

// HttpOnly: JavaScript can't read it (protects against XSS stealing it).
// Secure: only sent over HTTPS (browsers treat http://localhost as secure, so development still works).
// SameSite=Lax: not sent on cross-site form posts (protects against CSRF).
// path "/": sent with every request to our site, including /api.
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60 * 1000, // milliseconds
  };
}
