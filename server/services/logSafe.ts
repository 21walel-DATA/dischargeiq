// What we may write to the server log about an error (golden rules 2 and 13, D-041).
// Error objects can carry things that must never reach a log: a database connection error's text can include parts
// of the connection string, a broken-JSON error carries the raw request body (it could be a password), and a
// database "detail" can quote the values in a row (e.g. an email). So we log a short, safe summary instead.

// "name / code", e.g. "error / 23505" or "Error / ECONNREFUSED". Never the message.
export function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "unknown";
  }
  const name = "name" in error && typeof error.name === "string" ? error.name : "error";
  const code = "code" in error && (typeof error.code === "string" || typeof error.code === "number") ? String(error.code) : "no code";
  return `${name} / ${code}`;
}
