// Fetch wrappers for /api/auth. Relative URLs only: the browser talks to our own site, which forwards /api.
// The login cookie is HttpOnly, so this code never sees it: the browser attaches it to every /api request.
import {
  authResponseSchema,
  type LoginRequest,
  type PublicUser,
  type RegisterRequest,
} from "@dischargeiq/shared";
import { z } from "zod";

// What a login or register attempt can come back with: the user, or a message plus per-field messages.
export type AuthResult =
  | { ok: true; user: PublicUser }
  | { ok: false; message: string; fields: Record<string, string> };

// The shape of our API's error answers (see the server's controllers).
const errorBodySchema = z.object({
  error: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
});

const CANT_CONNECT = "We couldn't reach DischargeIQ. Check your connection and try again.";

async function postForUser(url: string, body: LoginRequest | RegisterRequest): Promise<AuthResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: CANT_CONNECT, fields: {} };
  }

  const json: unknown = await response.json().catch(() => null);
  if (response.ok) {
    const parsed = authResponseSchema.safeParse(json);
    if (parsed.success) {
      return { ok: true, user: parsed.data.user };
    }
  }
  const error = errorBodySchema.safeParse(json);
  return error.success
    ? { ok: false, message: error.data.error, fields: error.data.fields ?? {} }
    : { ok: false, message: CANT_CONNECT, fields: {} };
}

export function login(details: LoginRequest): Promise<AuthResult> {
  return postForUser("/api/auth/login", details);
}

export function register(details: RegisterRequest): Promise<AuthResult> {
  return postForUser("/api/auth/register", details);
}

// The logged-in user, or null if nobody is logged in (or the API can't be reached).
export async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      return null;
    }
    const parsed = authResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.user : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
