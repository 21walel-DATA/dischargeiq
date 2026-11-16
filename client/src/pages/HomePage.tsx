// Temporary home page for the "hello world" deploy: proves the browser → Vercel → Render → Supabase chain.
// The full home page (docs/designs/home-desktop.png) replaces it in Phase 2.
import { useEffect, useState } from "react";
import { fetchHealth } from "../api/health";
import styles from "./HomePage.module.css";

// The three things the status box can show.
type Status = "checking" | "ok" | "problem";

export function HomePage() {
  const [apiStatus, setApiStatus] = useState<Status>("checking");
  const [databaseStatus, setDatabaseStatus] = useState<Status>("checking");

  useEffect(() => {
    fetchHealth()
      .then((health) => {
        setApiStatus("ok");
        setDatabaseStatus(health.database === "ok" ? "ok" : "problem");
      })
      .catch(() => {
        setApiStatus("problem");
        setDatabaseStatus("problem");
      });
  }, []);

  return (
    <>
      <h1 className={styles.title}>See what changed in a discharge letter before the patient's next prescription</h1>
      <p>DischargeIQ is being built. This page checks that every part of the system is connected.</p>

      <section className={styles.status} aria-labelledby="status-title" aria-live="polite">
        <h2 id="status-title">System check</h2>
        <dl className={styles.list}>
          <div>
            <dt>API</dt>
            <dd>{describe(apiStatus)}</dd>
          </div>
          <div>
            <dt>Database</dt>
            <dd>{describe(databaseStatus)}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

function describe(status: Status): string {
  if (status === "checking") return "Checking…";
  if (status === "ok") return "Connected";
  return "Not reachable. Try again in a minute.";
}
