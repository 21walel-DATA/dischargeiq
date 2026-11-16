// Tests must NEVER run against the real database. They only use TEST_DATABASE_URL,
// which points at a separate Supabase project (locally) or a throwaway container (CI).
export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Add it to server/.env (see server/.env.example). Tests never use DATABASE_URL.",
    );
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must be a different database from DATABASE_URL.");
  }
  return url;
}
