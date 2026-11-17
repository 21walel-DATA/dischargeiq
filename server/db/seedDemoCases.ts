// Puts the SYNTHETIC demo cases (db/demoCases.ts) into the database as public, read-only cases.
// Safe to run again: it deletes the previous demo cases and recreates them, and touches nothing else.
import bcrypt from "bcryptjs";
import type pg from "pg";
import { DEMO_CASES } from "./demoCases";

// The demo cases belong to this account. Nobody can log in to it: its password is a random value nobody knows,
// and ".invalid" is a reserved domain that can never receive email.
const DEMO_OWNER_EMAIL = "demo-cases@dischargeiq.invalid";

export async function seedDemoCases(pool: pg.Pool): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const unusableHash = await bcrypt.hash(crypto.randomUUID(), 10);
    const owner = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, 'Demo cases')
       ON CONFLICT (lower(email)) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [DEMO_OWNER_EMAIL, unusableHash],
    );
    const ownerId = owner.rows[0].id;
    await client.query(`DELETE FROM cases WHERE user_id = $1`, [ownerId]);

    for (const demo of DEMO_CASES) {
      const created = await client.query<{ id: string }>(
        `INSERT INTO cases (user_id, reference, hospital_name, referral_received_at, letter_text, status, is_demo)
         VALUES ($1, $2, $3, now() - interval '20 hours', $4, 'in_progress', true) RETURNING id`,
        [ownerId, demo.reference, demo.hospitalName, demo.letterText],
      );
      const caseId = created.rows[0].id;
      await client.query(`INSERT INTO dms_stages (case_id, stage) VALUES ($1, 1), ($1, 2), ($1, 3)`, [caseId]);

      for (const m of demo.preAdmission) {
        await client.query(
          `INSERT INTO medicines (case_id, list_type, name, strength, form, dose, frequency, route)
           VALUES ($1, 'pre_admission', $2, $3, $4, $5, $6, $7)`,
          [caseId, m.name, m.strength, m.form, m.dose, m.frequency, m.route],
        );
      }
      // The demo shows the comparison straight away, so its discharge list is already "extracted".
      for (const m of demo.extraction) {
        await client.query(
          `INSERT INTO medicines (case_id, list_type, name, strength, form, dose, frequency, route,
                                  source_text, letter_status, ai_confidence)
           VALUES ($1, 'discharge', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [caseId, m.name, m.strength ?? null, m.form ?? null, m.dose ?? null, m.frequency ?? null, m.route ?? null,
            m.source_text, m.status_in_letter ?? null, m.confidence],
        );
      }
    }
    await client.query("COMMIT");
    return DEMO_CASES.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
