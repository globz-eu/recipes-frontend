# Plan: code best-practices rules (recipes-frontend #13)

Spec: [code-best-practices-rules.spec.md](code-best-practices-rules.spec.md).
Ticket: [recipes-frontend #13](https://github.com/globz-eu/recipes-frontend/issues/13).

## Context and goal

- Agents should write clean, simple, modular code without being told (issue #13).
- Adapt recipes-infrastructure PR #19: `code-quality.md`, `eslint.config.js`, size limits.
- Enforce every lintable rule with `npm run lint`; fix existing code without `eslint-disable`.
- Formatting is Prettier's job; `npm run format` writes, `npm run lint` checks.
- Behaviour-neutral; missing tests stay with recipes-frontend issue #3.
- Base: recipes-frontend `origin/main` `c0a36b7` (v0.7.0).
- Read from the working tree at `f9dbd73`; GitHub compare shows only the version bump differs.

## Acceptance criteria

1. `npm run lint` (`eslint . --max-warnings 0 && prettier --check .`) exits 0.
2. `npm run build` exits 0 and type-checks `tests/` via `tsconfig.test.json`.
3. `npm test` is green with 36 tests (baseline at `c0a36b7`).
4. `git grep -n eslint-disable -- src tests '*.ts' '*.js'` is empty.
5. A disable without `-- reason` fails lint; an unused disable fails lint.
6. Lint enforces all six size limits (200 / 60 / 10 / 3 / 3 / 3).
7. Lint enforces `no-else-return`, `no-nested-ternary`, `no-param-reassign`.
8. Lint enforces `no-explicit-any` (tests too) and `consistent-type-imports`.
9. Default exports fail lint except in `eslint.config.js`, `vite.config.ts`, `vitest.config.ts`.
10. Any `index.ts`/`index.tsx` fails lint; import cycles fail lint.
11. `fetch` in `src/` outside `src/api/client.ts` and `src/config.ts` fails lint.
12. `src/components/**` or `src/App.tsx` importing `src/api/client.ts` fails lint.
13. `dangerouslySetInnerHTML` outside `src/components/RecipeDetail.tsx` fails lint.
14. `src/` importing from `tests/` fails lint.
15. Boolean variables, parameters and own type properties need `is`/`has`/`can`/`should`.
16. Snake_case (API-shaped) boolean properties are exempt from criterion 15.
17. `npm run lint` fails on semicolons, single-quoted strings and non-2-space indent (`prettier --check`).
18. Criteria 5, 10–17 are probed with a throwaway file, then deleted.
19. Unit tests live in `tests/unit/` mirroring `src/`; none remain in `src/`.
20. Shared test setup lives in `tests/unit/support/`.
21. Moved tests change only imports, paths, helper names and `describe` grouping.
22. `.claude/rules/code-quality.md` has the 13 spec sections, each with a repo example.
23. `.claude/rules/frontend.md` keeps only repo-specific rules; no overlap.
24. `CLAUDE.md` links both rules files, new lint/test paths and commit style.
25. `npm run format` is idempotent: a second run changes nothing.
26. `code-quality.md` and `CLAUDE.md` mention `npm run format`; "Before finishing" runs it first.

## Design

### Dependencies (checked against the npm registry; ESLint 10, flat config)

- `prettier@^3.9.10`: no ESLint peer; Node >= 14.
- `eslint-config-prettier@^10.1.8`: peer `eslint >=7.0.0`; ships a `./flat` export.
- `eslint-plugin-import-x@^4.18.0`: peer `eslint ^8.57 || ^9 || ^10`.
- `eslint-import-resolver-typescript@^4.4.5`: peer `eslint *`; resolves `.tsx` imports.
- `@eslint-community/eslint-plugin-eslint-comments@^4.8.1`: peer up to `^10`.
- `typescript-eslint` installed 8.59.2: peer `eslint ^8.57 || ^9 || ^10`.
- Keep `recommended`, not `recommendedTypeChecked`: typed info only for `naming-convention`.
- Scripts: `"format": "prettier --write ."`, `"lint": "eslint . --max-warnings 0 && prettier --check ."`.
- `react-refresh` warnings fail via `--max-warnings 0`.

### Prettier config

- `.prettierrc`: `semi: false`, `tabWidth: 2`, `printWidth: 100`, `trailingComma: "all"`.
- `printWidth: 100`: existing code wraps near 100 (`vite.config.ts:55`, `client.ts`); the default 80 would reflow about 20 lines more.
- `trailingComma: "all"` is the Prettier 3 default; existing code already uses it (`RecipeList.tsx:28`); set explicitly.
- Defaults kept: double quotes (user), JSX attributes double-quoted, `arrowParens: "always"`.
- `.prettierignore`: `dist`, `node_modules`, `package-lock.json`, `docs/plans/*.html`, `*.tsbuildinfo`, `coverage`.
- SVG and PNG under `public/` and `src/assets/` are unsupported by Prettier; no ignore needed.
- `prettier .` also formats `.md`, `.json`, `.yml`, `.html`, `.css`; the format commit rewrites them too.

### `eslint.config.js` (rule names fixed; options tuned by first run)

```js
const SKIP_BLANKS_AND_COMMENTS = { skipBlankLines: true, skipComments: true }

export default defineConfig([
  globalIgnores(["dist/", "node_modules/"]),
  {
    files: ["**/*.{js,ts,tsx}"],
    extends: [js.configs.recommended, comments.recommended],
    plugins: { "import-x": importX },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    settings: { "import-x/resolver-next": [createTypeScriptImportResolver()] },
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
    files: ["**/index.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "Program", message: "No barrel index files; import the module directly." },
      ],
    },
  },
  {
    files: ["eslint.config.js", "vite.config.ts", "vitest.config.ts"],
    rules: { "import-x/no-default-export": "off" },
  },
  prettierConfig, // eslint-config-prettier/flat; last, so it wins over conflicting rules
])
```

- Config block above is shown unformatted; `npm run format` lays it out.
- `eslint-config-prettier` goes last; no formatting rules are enabled, it guards later additions.
- Prettier is not an ESLint plugin: formatting is checked by `prettier --check`, not by an ESLint rule.
- `objectLiteralProperty` is not checked: `strictPort`, `retry: false` are library APIs.
- `projectService` uses `tsconfig.app/node/test.json`; `eslint.config.js` stays untyped (JS block only).
- `import-x`: only the three rules, not its `recommended` preset (avoids resolver noise).

### Offenders found (confirm with the first lint run)

- Line numbers are from before the format commit; formatting may shift them.
- `src/App.tsx:51`: `export default App`; `src/main.tsx:5` imports it by default.
- `src/components/RecipeList.tsx:24` `RecipeList`: complexity about 12 (two loops, two `??`).
- `src/components/DevLoginForm.tsx:21`: boolean `submitting`.
- `vite.config.ts:54`: boolean `bare`.
- `src/components/LoginPrompt.test.tsx:16`: boolean parameter `ok` in `stubFetch`.
- `LoginPrompt.test.tsx:38`: `describe` callback about 88 counted lines.
- Client imports in components: `App.tsx:3`, `LoginPrompt.tsx:3`, `DevLoginForm.tsx:3`, `HomeContent.tsx:1`.
- At the limit, no change: `vite.config.ts:43` `readOrigin` complexity 10 (`?.`, `catch` count).
- No `any`, no `eslint-disable`, no cycles, no `else` after `return`, no nested ternaries, no reassigned params today.
- Semicolons and bad indent: none today; the format commit switches every string to double quotes and reflows lines.

### Source changes

- New `src/api/errors.ts`: `ApiError`, `isNoAccessError` (moved), new `isLoginRequiredError` (401/403).
- `App.tsx` uses `isLoginRequiredError` in `retry` and the render branch (DRY).
- `src/api/auth.ts`: add `devLogin(credentials)` (posts, then `resetCsrfToken`).
- `src/api/auth.ts`: add `forgetSession()` wrapping `resetCsrfToken` for the logout click.
- `src/auth/urls.ts`: add `providerLoginUrl(loginPath)` with `?next=` from `loginNextUrl()`.
- `LoginPrompt`, `DevLoginForm`, `HomeContent` and `App.tsx` import none of `client.ts`.
- `RecipeList.tsx`: internal pure `recipesForLocale(recipesByLocale, locale)` holds the ordering loops.
- `App` becomes a named export; renames `isSubmitting`, `isBareOrigin`.

### Test layout

- `src/api/auth.test.ts` → `tests/unit/api/auth.test.ts`.
- `src/auth/urls.test.ts` → `tests/unit/auth/urls.test.ts`.
- `src/components/{LoginPrompt,logout}.test.tsx` → `tests/unit/components/`.
- `src/test/smoke.test.tsx` → `tests/unit/smoke.test.tsx`.
- `src/test/{setup.ts,render.tsx}` → `tests/unit/support/`.
- `vi.mock`/`vi.doMock`/`import()` paths become `../../../src/...`.
- `LoginPrompt.test.tsx`: three `describe`s (provider links, `auth_error`, dev login form).
- `stubFetch(status, body)` replaces the `ok` flag; assertions unchanged.
- `vitest.config.ts`: `include: ['tests/unit/**/*.test.{ts,tsx}']`, setup `./tests/unit/support/setup.ts`.
- New `tsconfig.test.json` (copy of `tsconfig.app.json`, `include: ["tests"]`); referenced from `tsconfig.json`.
- `tests/e2e/` is not created (issue #3).

### Rules files

- `code-quality.md` follows the recipes-infrastructure text, adapted section by section.
- Simplicity/YAGNI: URL-hash selection instead of a router; no speculative options.
- DRY: `isLoginRequiredError`, `logoutUrl()` shared by `HomeContent` and `NoAccessPrompt`.
- Separation of concerns: `fetch` only in `client.ts`/`config.ts`; components and `App.tsx` use `src/api/<resource>.ts`.
- Size limits: `recipesForLocale` split out of `RecipeList`; props object counts as one parameter.
- Naming: `authErrorFromLocation`, `isSubmitting`, `HASH_PREFIX`; snake_case API fields exempt.
- Enums: `as const` + `EnumValue`/`isEnumValue` in `src/enum.ts`, added with the first enum.
- Comments: `getCsrfToken` (cookie on backend host), `RecipeDetail` (Wagtail whitelists markup).
- Testing: Vitest in `tests/unit`; e2e for user-facing features once #3 lands.
- Before finishing: `npm run format`, `npm run lint`, `npm run build`, `npm test`.
- `frontend.md`: drop lines 15–17 (types, style, "no tests"); keep API, config, hash, rich text.
- `frontend.md:16`: keep "one component per file in `src/components/`, named after it".
- `CLAUDE.md:14,21,28-29`: lint description (ESLint + Prettier), `npm run format`, `tests/unit` paths, `errors.ts`, `providerLoginUrl`.
- `CLAUDE.md`: new "Conventions" section linking both rules files and the commit style.

### Decisions (resolved questions)

- `src/App.tsx` counts as a component: it may not import `client.ts` (criterion 12).
- Keep the logout-click CSRF reset, as `forgetSession()` in `src/api/auth.ts` (behaviour-neutral).
- Leave `apiPut`/`apiPatch`/`apiDelete` in `client.ts` untouched.
- Prettier, not `@stylistic`, owns formatting.
- Format-only changes get their own commit, separate from logic changes.

### Trade-offs

- Typed linting slows `npm run lint`; accepted (spec).
- `no-restricted-paths` over `no-restricted-imports`: one rule covers both boundaries.
- `errors.ts` instead of wrappers per error: components may still use `ApiError` for status.
- Prettier over `@stylistic`: no rule options to tune; one tool formats `.ts`, `.json`, `.md`.
- `printWidth: 100` over 80: keeps the existing code nearly unchanged.
- Format commit lands before logic commits, so later diffs stay readable.
- Fixing code before adding the config keeps every commit's `npm run lint` green.

## Implementation steps

- Every step keeps `npm run lint`, `npm run build` and `npm test` green (36 tests).
- From step 3 on, run `npm run format` before each commit so the tree stays formatted.
- Each step touches at most 8 files, except step 2.
- Commit messages: short, capitalised imperative, no prefix.

1. `Add Prettier`: `package.json`, `package-lock.json`, `.prettierrc`, `.prettierignore` (4).
   - Adds `format` script only; `lint` unchanged, so lint stays green before the format commit.
2. `Format existing files with Prettier`: output of `npm run format` (mechanical).
   - Exception to the 8-file limit: touches every file Prettier rewrites (sources, configs, `.md`, `.json`).
   - Format-only: no logic edits; review with `git diff -w --stat` and run lint, build, test.
3. `Move API errors into their own module`: `errors.ts`, `client.ts`, `App.tsx`, `DevLoginForm.tsx` (4).
4. `Keep the API client out of components`: `api/auth.ts`, `auth/urls.ts`, `LoginPrompt`, `DevLoginForm`, `HomeContent` (5).
5. `Export App by name`: `App.tsx`, `main.tsx` (2).
6. `Extract recipe ordering from RecipeList`: `RecipeList.tsx` (1).
7. `Name booleans as questions`: `DevLoginForm.tsx`, `vite.config.ts` (2).
8. `Type-check tests in tests/unit`: `tsconfig.test.json`, `tsconfig.json`, `vitest.config.ts`, two moved tests (5).
   - `vitest.config.ts` temporarily includes both `src/` and `tests/unit/`.
9. `Move component tests and setup to tests/unit`: 5 moved files, `vitest.config.ts` (6).
   - Includes the `describe` split and `stubFetch(status, body)`.
10. `Enforce code rules with ESLint`: `package.json`, `package-lock.json`, `eslint.config.js` (3).
    - Also adds `prettier --check .` to `lint` and `eslint-config-prettier`.
    - Fix any remaining finding here, staying within 8 files; probe criteria 5, 10–17.
11. `Add code quality rules`: `.claude/rules/code-quality.md`, `.claude/rules/frontend.md`, `CLAUDE.md` (3).
    - Run `npm run format` first: the new `.md` files must pass `prettier --check`.

## Risks

- Solution-style `tsconfig.json` with `projectService`; fallback is `project: [three tsconfigs]`.
- `naming-convention` precedence: if the snake_case exemption loses, adjust selector order.
- Reflow by Prettier can push a file toward `max-lines` or a function toward 60 lines; recheck at step 10.
- Prettier rewrites `.md`, `.yml`, `.json` too; if unwanted, narrow `.prettierignore`.
- Untracked `docs/plans/*.md` are formatted too; commit order decides who owns the diff.
- `readOrigin` sits at complexity 10; any added branch needs a split.
- Wrong `vi.mock` paths stop mocking; `getConfig` then throws, so tests fail loudly.
- `import-x/no-cycle` with the TS resolver adds lint time; fine at this size.
- Further merges to recipes-frontend `main` shift offenders; rerun lint at step 10.
- `eslint-config-prettier` 10.1.8 does not state ESLint 10 support; its peer range allows it, verify at install.

## Open questions

- None.
