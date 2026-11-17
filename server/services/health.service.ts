import { getPool } from "../db/pool";
import { errorCode } from "./logSafe";

// Runs the cheapest possible query. Calling this regularly also stops the free Supabase project pausing.
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch (error) {
    // The error code only (D-041): a connection error's text can contain parts of the connection string.
    console.error(`Database health check failed (${errorCode(error)})`);
    return false;
  }
}
