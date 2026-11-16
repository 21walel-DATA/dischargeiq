// Production build: bundles the server into dist/index.js (D-019).
// The shared package is bundled IN (it's TypeScript source); normal npm packages stay outside.
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  noExternal: ["@dischargeiq/shared"],
});
