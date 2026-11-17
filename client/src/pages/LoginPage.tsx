// Log in and Create an account share one page (docs/designs/login-desktop.png), switched by the address:
// /login or /register. The same Zod rules as the server check the form first, so most mistakes show instantly;
// the server still checks everything again.
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { loginRequestSchema, registerRequestSchema } from "@dischargeiq/shared";
import { login, register } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import form from "../components/Form.module.css";
import styles from "./LoginPage.module.css";

type Mode = "login" | "register";

// Zod's issues → { field: "first message" }, the same shape the server sends back.
function firstMessagePerField(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    if (!(field in result)) {
      result[field] = issue.message;
    }
  }
  return result;
}

export function LoginPage({ mode }: { mode: Mode }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  // Where to go after logging in: the page that sent you here, or "My cases".
  const location = useLocation();
  const from: unknown = location.state?.from;
  const next = typeof from === "string" && from.startsWith("/") ? from : "/cases";

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Already logged in: nothing to do here.
  if (user) {
    return <Navigate to={next} replace />;
  }

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); // stop the browser's own form submit; we send JSON ourselves
    setMessage("");
    setFields({});

    const check = isRegister
      ? registerRequestSchema.safeParse({ email, displayName, password })
      : loginRequestSchema.safeParse({ email, password });
    if (!check.success) {
      setMessage("Check the details you entered.");
      setFields(firstMessagePerField(check.error.issues));
      return;
    }

    setBusy(true);
    const result = isRegister
      ? await register({ email, displayName, password })
      : await login({ email, password });
    setBusy(false);

    if (!result.ok) {
      setMessage(result.message);
      setFields(result.fields);
      return;
    }
    setUser(result.user);
    navigate(next, { replace: true });
  }

  const title = isRegister ? "Create an account" : "Log in";

  return (
    <div className={styles.wrap}>
      <div className={styles.auth}>
        <nav className={styles.segmented} aria-label="Log in or create an account">
          <Link to="/login" aria-current={isRegister ? undefined : "page"}>
            Log in
          </Link>
          <Link to="/register" aria-current={isRegister ? "page" : undefined}>
            Create an account
          </Link>
        </nav>

        <h1>{title}</h1>

        <form className={styles.panel} onSubmit={handleSubmit} noValidate>
          {message && (
            <div className={form.alert} role="alert">
              <strong>{message}</strong>
            </div>
          )}

          <Field id="email" label="Email" error={fields.email}>
            <input
              className={form.input}
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={fields.email ? true : undefined}
              aria-describedby={fields.email ? "email-error" : undefined}
            />
          </Field>

          {isRegister && (
            <Field id="displayName" label="Display name" hint="Shown when you sign off a DMS stage." error={fields.displayName}>
              <input
                className={form.input}
                id="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                aria-invalid={fields.displayName ? true : undefined}
                aria-describedby={describedBy("displayName", true, Boolean(fields.displayName))}
              />
            </Field>
          )}

          <Field
            id="password"
            label="Password"
            hint={isRegister ? "At least 12 characters. A short phrase is easier to remember." : undefined}
            error={fields.password}
          >
            <input
              className={form.input}
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={fields.password ? true : undefined}
              aria-describedby={describedBy("password", isRegister, Boolean(fields.password))}
            />
          </Field>

          <button className={`${form.button} ${form.fullWidth}`} type="submit" disabled={busy}>
            {busy ? (isRegister ? "Creating account…" : "Logging in…") : title}
          </button>
        </form>

        <p className={styles.switch}>
          {isRegister ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              No account yet? <Link to="/register">Create an account</Link> with your email, a display name and a
              password of at least 12 characters.
            </>
          )}
        </p>
      </div>

      <aside className={styles.aside}>
        <h2>Before you start</h2>
        <p>This is a prototype for a bootcamp project. Use it only with the synthetic demo letters, never with real patients.</p>
        <p>We store your email, a display name and a scrambled (hashed) password. Nothing else about you.</p>
        <p>
          <Link to="/demo">Look at a demo case without an account</Link>
        </p>
      </aside>
    </div>
  );
}

// Which hint/error texts describe an input, for screen readers.
function describedBy(id: string, hasHint: boolean, hasError: boolean): string | undefined {
  const ids = [hasHint ? `${id}-hint` : "", hasError ? `${id}-error` : ""].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

// A label, optional hint, the input itself, and an optional error under it.
function Field(props: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className={form.field}>
      <label className={form.label} htmlFor={props.id}>
        {props.label}
      </label>
      {props.hint && (
        <span className={form.hint} id={`${props.id}-hint`}>
          {props.hint}
        </span>
      )}
      {props.children}
      {props.error && (
        <span className={form.error} id={`${props.id}-error`}>
          <span className={form.errorMark} aria-hidden="true">
            !
          </span>
          {props.error}
        </span>
      )}
    </div>
  );
}
