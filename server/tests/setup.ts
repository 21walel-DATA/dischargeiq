// Runs before each test file: point the app's database pool at the TEST database.
// (globalSetup has already checked that TEST_DATABASE_URL exists and differs from DATABASE_URL.)
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is not set. Add it to server/.env (see server/.env.example).");
}
process.env.DATABASE_URL = testUrl;
