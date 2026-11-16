// One shared connection pool to PostgreSQL (Supabase in London), used by every service.
// Only this server talks to the database; the browser never does (D-008, D-017).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import type { ConnectionOptions } from "node:tls";

// How to use SSL, set by DATABASE_SSL:
//   "verify" (default): encrypted AND the server's certificate is checked against Supabase's CA certificate
//   "off": no SSL, only for the throwaway Postgres container in CI
function sslSettings(): ConnectionOptions | false {
  if (process.env.DATABASE_SSL === "off") {
    return false;
  }
  // The CA certificate is public (not a secret), so it is committed to the repo.
  const caPath = resolve(process.cwd(), "db/certs/supabase-ca.crt");
  return { ca: readFileSync(caPath, "utf8") };
}

export function createPool(connectionString: string | undefined): pg.Pool {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new pg.Pool({
    connectionString,
    ssl: sslSettings(),
    max: 5, // small pool: the free Supabase session pooler allows few connections
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

// Created on first use, so importing this file never crashes when DATABASE_URL is missing.
let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = createPool(process.env.DATABASE_URL);
  }
  return pool;
}
