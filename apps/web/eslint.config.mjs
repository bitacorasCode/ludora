import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
        plugins: {
            "simple-import-sort": simpleImportSort,
            "unused-imports": unusedImports,
        },
        rules: {
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",

            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "warn",
                {
                    vars: "all",
                    varsIgnorePattern: "^_",
                    args: "after-used",
                    argsIgnorePattern: "^_",
                },
            ],
        },
    },
    prettier,
    globalIgnores([".next/**", ".next-e2e/**", "coverage/**", "playwright-report/**", "test-results/**", "out/**", "build/**", "next-env.d.ts"]),
]);
