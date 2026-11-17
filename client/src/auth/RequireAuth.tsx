// Wraps pages that need a login. Not logged in → sent to the login page, then brought back afterwards.
// This is for convenience only: the SERVER is what actually protects the data (every /api route checks the cookie).
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) {
    return <p role="status">Checking your login…</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
