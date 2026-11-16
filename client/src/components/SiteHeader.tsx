import { Link, NavLink } from "react-router";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.wordmark} to="/">
          <span className={styles.mark} aria-hidden="true" />
          DischargeIQ
        </Link>
        {/* More links (My cases, Demo cases, Log in) arrive with their pages. */}
        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
