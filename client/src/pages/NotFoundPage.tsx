import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <p>Check the address, or go back to the home page.</p>
      <Link to="/">Go to the home page</Link>
    </>
  );
}
