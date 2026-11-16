// Runs once before all test files: brings the test database's tables up to date.
import { createPool } from "../db/pool";
import { runMigrations } from "../db/runMigrations";
import { getTestDatabaseUrl } from "./testDatabaseUrl";

export default async function setup(): Promise<void> {
  const pool = createPool(getTestDatabaseUrl());
  try {
    await runMigrations(pool);
  } finally {
    await pool.end();
  }
}
