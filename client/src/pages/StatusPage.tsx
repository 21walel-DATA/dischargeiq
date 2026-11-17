// System status (/status): proves the browser → Vercel → Render → Supabase chain, and shows the login state.
// Was the first "hello world" home page; kept as a small status page (linked from the footer).
import { useEffect, useState } from "react";
import { fetchHealth } from "../api/health";
import { useAuth } from "../auth/AuthContext";
import styles from "./StatusPage.module.css";

// The three things the status box can show.
type Status = "checking" | "ok" | "problem";

export function StatusPage() {
  const [apiStatus, setApiStatus] = useState<Status>("checking");
  const [databaseStatus, setDatabaseStatus] = useState<Status>("checking");
  const { user, checking } = useAuth();

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
      <h1 className={styles.title}>System status</h1>
      <p>This page checks that every part of DischargeIQ is connected: the app, the API and the database.</p>

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
          {/* Proves the login cookie works: refresh the page and you should still be logged in. */}
          <div>
            <dt>Login</dt>
            <dd>{checking ? "Checking…" : user ? `Logged in as ${user.displayName}` : "Not logged in"}</dd>
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
