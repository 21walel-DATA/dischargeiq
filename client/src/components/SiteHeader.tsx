import { Link, NavLink, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  const { user, checking, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login");
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.wordmark} to="/">
          <span className={styles.mark} aria-hidden="true" />
          DischargeIQ
        </Link>
        {/* Claims & stats arrives in Phase 3. The wordmark links home. */}
        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/demo">Demo cases</NavLink>
          {user && <NavLink to="/cases">My cases</NavLink>}
          {/* While the first /me check runs, show neither option so the header doesn't flicker. */}
          {!checking && !user && <NavLink to="/login">Log in</NavLink>}
          {user && (
            <>
              <span className={styles.user}>{user.displayName}</span>
              <button className={styles.navButton} type="button" onClick={handleLogout}>
                Log out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
