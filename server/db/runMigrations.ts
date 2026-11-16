// Applies numbered .sql files in db/migrations that haven't run yet (D-018).
// Each file runs inside a transaction: it either fully applies or not at all.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type pg from "pg";

const migrationsDir = resolve(process.cwd(), "db/migrations");

export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  // The table that remembers which files have already been applied.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const done = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations");
  const alreadyApplied = new Set(done.rows.map((row) => row.filename));

  // "001_init.sql", "002_...sql": sorting by name gives the right order.
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const appliedNow: string[] = [];
  for (const file of files) {
    if (alreadyApplied.has(file)) {
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      appliedNow.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed and was rolled back`, { cause: error });
    } finally {
      client.release();
    }
  }
  return appliedNow;
}
