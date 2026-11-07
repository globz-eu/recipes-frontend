import js from "@eslint/js"
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs"
import globals from "globals"
import prettierConfig from "eslint-config-prettier/flat"
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript"
import importX from "eslint-plugin-import-x"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

const SKIP_BLANKS_AND_COMMENTS = { skipBlankLines: true, skipComments: true }

export default defineConfig([
  globalIgnores(["dist/", "node_modules/"]),
  {
    files: ["**/*.{js,ts,tsx}"],
    extends: [js.configs.recommended, comments.recommended],
    plugins: { "import-x": importX },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    settings: {
      // Without the extensions, import-x skips .ts/.tsx modules and no-cycle finds nothing.
      "import-x/extensions": [".js", ".ts", ".tsx"],
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "max-lines": ["error", { max: 200, ...SKIP_BLANKS_AND_COMMENTS }],
      "max-lines-per-function": ["error", { max: 60, ...SKIP_BLANKS_AND_COMMENTS }],
      complexity: ["error", { max: 10 }],
      "max-depth": ["error", { max: 3 }],
      "max-params": ["error", { max: 3 }],
      "max-nested-callbacks": ["error", { max: 3 }],
      "no-else-return": ["error", { allowElseIf: false }],
      "no-nested-ternary": "error",
      "no-param-reassign": "error",
      "@eslint-community/eslint-comments/require-description": "error",
      "import-x/no-default-export": "error",
      "import-x/no-cycle": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            { target: "./src", from: "./tests", message: "src/ never imports tests/." },
            {
              target: ["./src/components", "./src/App.tsx"],
              from: "./src/api/client.ts",
              message: "Use a src/api/<resource>.ts module.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          // API-shaped (snake_case) fields mirror the backend and keep their names.
          selector: "typeProperty",
          types: ["boolean"],
          filter: { regex: "_", match: true },
          format: null,
        },
        {
          selector: ["variable", "parameter", "classProperty", "typeProperty"],
          types: ["boolean"],
          format: ["PascalCase"],
          prefix: ["is", "has", "can", "should"],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", { name: "fetch", message: "Use src/api/client.ts." }],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "fetch" },
        { object: "globalThis", property: "fetch" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Only RecipeDetail renders backend rich text.",
        },
      ],
    },
  },
  {
    files: ["src/api/client.ts", "src/config.ts"],
    rules: { "no-restricted-globals": "off", "no-restricted-properties": "off" },
  },
  { files: ["src/components/RecipeDetail.tsx"], rules: { "no-restricted-syntax": "off" } },
  {
    files: ["tests/e2e/**/*.ts", "playwright.config.ts"],
    languageOptions: { globals: globals.node },
    // Playwright fixtures call use(), which the hooks rules mistake for React's use().
    rules: { "react-hooks/rules-of-hooks": "off", "react-hooks/exhaustive-deps": "off" },
  },
  {
    files: ["**/index.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "Program", message: "No barrel index files; import the module directly." },
      ],
    },
  },
  {
    files: ["eslint.config.js", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"],
    rules: { "import-x/no-default-export": "off" },
  },
  prettierConfig, // last, so it wins over conflicting rules
])
