import styles from "./SiteFooter.module.css";

// The prototype notice must be visible on every page (design-system.md).
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span>
          <strong>Prototype.</strong> Synthetic data only. Not a medical device.
        </span>
        <span>Supports the pharmacist's decision; never makes it.</span>
      </div>
    </footer>
  );
}
