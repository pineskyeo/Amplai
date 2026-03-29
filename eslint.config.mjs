import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import harnessPlugin from "./eslint-rules/index.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Amplai Harness Plugin — MVPVM 구조 강제
  {
    plugins: {
      harness: harnessPlugin,
    },
    rules: {
      // 파일 네이밍
      "harness/file-kebab-case": "error",
      "harness/no-list-detail-suffix": "error",

      // 인터페이스/타입 네이밍
      "harness/no-interface-prefix": "error",
      "harness/suffix-naming": "error",
      "harness/array-prop-plural": "error",

      // MVPVM 레이어 규칙
      "harness/presenter-naming": "error",
      "harness/no-default-export-model": "error",
      "harness/no-direct-supabase": "error",
      "harness/layer-boundary": "error",

      // 기본 코드 품질
      "no-console": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "eslint-rules/**",
  ]),
]);

export default eslintConfig;
