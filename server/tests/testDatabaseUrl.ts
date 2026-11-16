// Tests must NEVER run against the real database. They only use TEST_DATABASE_URL,
// which points at a separate Supabase project (locally) or a throwaway container (CI).

// Which database a connection string points at: user (on Supabase this includes the project id),
// host, port and database name. The password is ignored on purpose: two strings for the SAME project
// with different passwords are still the same database.
export function databaseIdentity(connectionString: string): string {
  const url = new URL(connectionString);
  return `${url.username}@${url.hostname}:${url.port}${url.pathname}`;
}

export function getTestDatabaseUrl(): string {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Add it to server/.env (see server/.env.example). Tests never use DATABASE_URL.",
    );
  }
  const realUrl = process.env.DATABASE_URL;
  if (realUrl && databaseIdentity(testUrl) === databaseIdentity(realUrl)) {
    throw new Error("TEST_DATABASE_URL points at the same database as DATABASE_URL. Use the separate test project.");
  }
  return testUrl;
}
