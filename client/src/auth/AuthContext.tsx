// Who is logged in, shared with every page and the header.
// React "context" is a value any component inside <AuthProvider> can read with useAuth(), instead of passing
// it down through every component by hand.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@dischargeiq/shared";
import { fetchCurrentUser, logout as logoutRequest } from "../api/auth";

type AuthState = {
  user: PublicUser | null; // null = nobody logged in
  checking: boolean; // true until the first /api/auth/me answer arrives
  setUser: (user: PublicUser | null) => void; // called by the login page after a successful login
  logout: () => Promise<void>;
};

// `createContext<AuthState | null>` says what kind of value the context holds; null until the provider sets it.
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [checking, setChecking] = useState(true);

  // On first load, ask the server whether the browser's cookie belongs to someone.
  // This is how a login survives a page refresh: the cookie stays, and /me turns it back into a user.
  useEffect(() => {
    fetchCurrentUser().then((current) => {
      setUser(current);
      setChecking(false);
    });
  }, []);

  async function logout(): Promise<void> {
    await logoutRequest();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, checking, setUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth() must be used inside <AuthProvider>");
  }
  return value;
}
