import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

// Load server/.env (locally) into process.env so both the global setup and the tests can see
// TEST_DATABASE_URL. Values already set (for example by the CI workflow) are never overwritten.
const fileEnv = loadEnv("test", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

export default defineConfig({
  test: {
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false, // tests share one database, so run files one at a time
  },
});
