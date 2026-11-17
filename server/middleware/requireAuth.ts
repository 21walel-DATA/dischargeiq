// Guards for routes that need a logged-in user (and, for some, a particular role).
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@dischargeiq/shared";
import { authUserSchema, SESSION_COOKIE, verifySessionToken, type AuthUser } from "../services/session.service";

const NOT_LOGGED_IN = { error: "Log in to continue." };
const NOT_ALLOWED = { error: "You don't have permission to do that." };

// Reads the login cookie. If it holds a valid token, remembers the user for this request (res.locals is
// Express's per-request storage) and carries on; otherwise stops with 401.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = verifySessionToken(req.cookies?.[SESSION_COOKIE]);
  if (!user) {
    res.status(401).json(NOT_LOGGED_IN);
    return;
  }
  res.locals.user = user;
  next();
}

// Use AFTER requireAuth. Returns a middleware that only lets the given roles through (403 otherwise).
export function requireRole(...allowed: Role[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = getCurrentUser(res);
    if (!allowed.includes(user.role)) {
      res.status(403).json(NOT_ALLOWED);
      return;
    }
    next();
  };
}

// The logged-in user for this request. res.locals has no fixed type, so we check its shape before trusting it.
// Calling this on a route without requireAuth is a programming mistake, so it throws (the user sees a 500).
export function getCurrentUser(res: Response): AuthUser {
  const parsed = authUserSchema.safeParse(res.locals.user);
  if (!parsed.success) {
    throw new Error("getCurrentUser() used on a route without requireAuth");
  }
  return parsed.data;
}
