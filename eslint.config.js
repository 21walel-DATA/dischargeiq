// ESLint finds likely bugs and style problems. CI runs it on every push.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["server/**/*.ts", "shared/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  {
    rules: {
      // D-016: no `any` and no non-null assertions (`value!`).
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      // A leading underscore marks a parameter that must exist but isn't used (e.g. Express's `_next`).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
