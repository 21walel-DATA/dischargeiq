// Business logic for accounts: create a user, check a login, look a user up.
// Passwords are never stored or logged: only a bcrypt hash (a one-way scramble with a random salt).
import bcrypt from "bcryptjs";
import type { LoginRequest, PublicUser, RegisterRequest, Role } from "@dischargeiq/shared";
import { getPool } from "../db/pool";

// Cost 10 = 2^10 rounds. Higher is slower for attackers AND for us; 10 is OWASP's minimum for bcrypt and keeps
// login under a second on Render's free CPU. Production would use a higher cost (or Argon2id) on better hardware.
const BCRYPT_COST = 10;

// A row from the users table, in the column names Postgres returns.
type UserRow = {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  password_hash: string;
};

function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

// Either the new user, or "emailTaken" when that email already has an account (the controller sends 409).
// A "union" type: a value that is one of two shapes. Checking `result.ok` tells TypeScript which one it is.
export type RegisterResult = { ok: true; user: PublicUser } | { ok: false; reason: "emailTaken" };

export async function registerUser(input: RegisterRequest): Promise<RegisterResult> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    // $1, $2, $3 are parameters: the values travel separately from the SQL, so they can't change the query.
    // Everyone registers as a pharmacist; the role can't be chosen from the browser.
    const result = await getPool().query<UserRow>(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, role, password_hash`,
      [input.email, passwordHash, input.displayName],
    );
    return { ok: true, user: toPublicUser(result.rows[0]) };
  } catch (error) {
    // 23505 = Postgres "unique violation": the users_email_unique index found the same email.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { ok: false, reason: "emailTaken" };
    }
    throw error;
  }
}

// A real bcrypt hash of a random throwaway password, made once. Comparing against it when the email doesn't
// exist means a wrong email takes as long as a wrong password, so timing can't reveal who has an account.
let dummyHash: string | undefined;
async function getDummyHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = await bcrypt.hash(crypto.randomUUID(), BCRYPT_COST);
  }
  return dummyHash;
}

// Returns the user if the email and password match, otherwise null (never says which one was wrong).
export async function verifyLogin(input: LoginRequest): Promise<PublicUser | null> {
  const result = await getPool().query<UserRow>(
    `SELECT id, email, display_name, role, password_hash FROM users WHERE lower(email) = $1`,
    [input.email],
  );
  const row = result.rows[0];
  if (!row) {
    await bcrypt.compare(input.password, await getDummyHash());
    return null;
  }
  const matches = await bcrypt.compare(input.password, row.password_hash);
  return matches ? toPublicUser(row) : null;
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const result = await getPool().query<UserRow>(
    `SELECT id, email, display_name, role, password_hash FROM users WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? toPublicUser(row) : null;
}
