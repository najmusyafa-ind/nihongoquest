import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Next.js build outputs
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent skill scripts (CommonJS, not app code)
    ".agents/**",
    // Dependencies
    "node_modules/**",
    // Test & coverage outputs
    "coverage/**",
    "dist/**",
  ]),
  // Relax `any` rule for test files (pre-existing, not app code)
  {
    files: ["src/__tests__/**/*.ts", "src/__tests__/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
