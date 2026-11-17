// Command-line entry: `npm run seed` (locally) or the "Run migrations" GitHub Actions job (after migrating).
// Adds the synthetic demo cases. Never real patient data (golden rule 1).
import { getPool } from "./pool";
import { seedDemoCases } from "./seedDemoCases";

const pool = getPool();
try {
  const count = await seedDemoCases(pool);
  console.log(`Seeded ${count} synthetic demo case(s).`);
} catch (error) {
  // Only the error code (D-041): a database message can contain parts of the connection string.
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
  console.error(`Seeding failed (code ${code}).`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
