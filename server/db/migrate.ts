// Command-line entry: `npm run migrate` (locally) or the "Run migrations" GitHub Actions job.
import { getPool } from "./pool";
import { runMigrations } from "./runMigrations";
import { errorCode } from "../services/logSafe";

const pool = getPool();
try {
  const applied = await runMigrations(pool);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database already up to date.");
} catch (error) {
  // The file name and the database's error code only (D-041): this log is visible in GitHub Actions, and a
  // database message can contain parts of the connection string. runMigrations wraps the error with the file name.
  // Only OUR message ("Migration 003_x.sql failed and was rolled back") is printed; a connection error's own text never is.
  const ours = error instanceof Error && error.message.startsWith("Migration ") ? error.message : "Migration failed";
  const cause = error instanceof Error && error.cause !== undefined ? error.cause : error;
  console.error(`${ours} (${errorCode(cause)})`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
