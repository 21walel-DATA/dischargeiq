// Command-line entry: `npm run migrate` (locally) or the "Run migrations" GitHub Actions job.
import { getPool } from "./pool";
import { runMigrations } from "./runMigrations";

const pool = getPool();
try {
  const applied = await runMigrations(pool);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database already up to date.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
