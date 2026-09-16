import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // The new compiler-era react-hooks rules flag two common, correct patterns
      // heavily used in this Firebase app: resetting form state when a modal opens
      // (react-hooks/set-state-in-effect) and Date.now() inside event handlers
      // (react-hooks/purity). Both are legitimate here, so downgrade to warnings.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;