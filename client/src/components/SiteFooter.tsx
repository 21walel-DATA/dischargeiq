import { Link } from "react-router";
import styles from "./SiteFooter.module.css";

// The prototype notice must be visible on every page (design-system.md).
// Small links: the system status check and the API documentation.
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span>
          <strong>Prototype.</strong> Synthetic data only. Not a medical device.
        </span>
        <span>Supports the pharmacist's decision; never makes it.</span>
        <span className={styles.links}>
          <Link to="/status">System status</Link>
          {/* A plain link: /api/docs is served by the API, not by the React app. */}
          <a href="/api/docs">API docs</a>
        </span>
      </div>
    </footer>
  );
}
