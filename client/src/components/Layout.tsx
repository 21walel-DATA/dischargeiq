// The frame around every page: header, the page itself (<Outlet />), footer.
import { Outlet } from "react-router";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import styles from "./Layout.module.css";

export function Layout() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
