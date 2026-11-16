import { getPool } from "../db/pool";

// Runs the cheapest possible query. Calling this regularly also stops the free Supabase project pausing.
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch (error) {
    // Details go to the server log only (golden rule 13).
    console.error("Database health check failed:", error);
    return false;
  }
}
