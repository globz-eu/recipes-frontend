# Plan: unit and e2e tests for the frontend

Ticket: recipes-frontend issue #3. Spec: `docs/plans/frontend-tests.spec.md` (approved, binding).

## Context and goal

- Only tests today: `src/api/auth.test.ts`, `src/auth/urls.test.ts`, `LoginPrompt.test.tsx`, `logout.test.tsx`, `smoke.test.tsx`.
- Fill unit-test gaps in the API client, locale, config and logic components.
- Add Playwright e2e (Chromium) against the built app with a mocked CMS API.
- Run both in `release.yml` and in a new PR/push workflow `ci.yml`; update `CLAUDE.md`, `.claude/rules/frontend.md`, README.
- Out of scope: bulk upload, CSS/layout, real compose stack, coverage thresholds.

## Acceptance criteria

1. `npm test` passes and includes new tests for `client.ts`, `config.ts`, `locale.ts`.
2. `client.ts` tests: CSRF fetched once and cached, reset after failure, `X-CSRFToken` only on unsafe methods.
3. `client.ts` tests: 403 mentioning CSRF refreshes the token and retries exactly once.
4. `client.ts` tests: non-2xx throws `ApiError` (status, JSON or text body); `isNoAccessError`; `apiUrl` prefix.
5. `locale.ts` tests: stored choice, browser language, English fallback, throwing `localStorage`.
6. Component tests: `RecipeList`, `RecipeDetail` (+`RecipeMeta`), `HomeContent`, `LanguageSwitch`, `App`, `DevLoginForm`.
7. `npm run test:e2e` builds, serves `/frontend/` via `vite preview` on `E2E_PORT` (default 4173), runs Chromium offline.
8. E2E covers login prompt (401 and 403), `auth_error`, no-access, list, recipe hash, language switch, logout.
9. Unmocked API requests fail the e2e test instead of reaching a network.
10. `npm test` does not pick up `e2e/`; `npm run lint && npm run build` type-check and lint `e2e/`.
11. `release.yml` runs unit and e2e tests before packaging and creating the release.
12. `ci.yml` runs lint, unit tests, build and e2e on pull requests and pushes to the default branch.
13. Both workflows upload `playwright-report/` as an artifact when e2e fails.
14. `CLAUDE.md`, `.claude/rules/frontend.md` and README describe both test commands and `E2E_PORT`.

## Design

### Mock API shapes (from recipes-cms)

- `GET /api/csrf/` -> `{ csrfToken }` (`home/views.py:CsrfTokenView`).
- `GET /api/auth/providers/` -> `{ providers: [{ id, label, login_url }] }` (`oidc_auth/views.py:75`).
- `GET /api/home/?locale=xx` -> `[{ title, description }]`, unpaginated (`home/serializers.py`).
- `GET /api/recipes/` -> `{ locales: { en: [], de: [], fr: [], nl: [] } }`, every locale key present (`recipes/views.py:35`).
- Recipe fields: `id, title, slug, locale, translation_key, ingredients[{quantity, unit, name}], preparation (HTML), preparation_time, cooking_time, number_of_people`.
- Anonymous: 403 `{ detail: "Authentication credentials were not provided." }` (DRF `SessionAuthentication`, no 401).
- No role: 403 `{ detail, code: "no_access" }` (`home/permissions.py:34`).
- CSRF failure: 403 `{ detail: "CSRF Failed: ..." }`; `/admin/logout/?next=` and `/login/<backend>/?next=` redirect (302).

### Unit tests (vitest, colocated)

- New: `src/api/client.test.ts`, `src/config.test.ts`, `src/locale.test.ts`.
- New: `RecipeList.test.tsx`, `RecipeDetail.test.tsx`, `HomeContent.test.tsx`, `LanguageSwitch.test.tsx`, `src/App.test.tsx`.
- New (user decision): `DevLoginForm.test.tsx` (400/404 messages, `resetCsrfToken`, home invalidation).
- Shared recipe/home fixtures in `src/test/fixtures.ts`, typed with `Recipe`/`HomePage`.
- Reuse `renderWithQuery`, `vi.stubGlobal('fetch')`, `vi.mock('../config')` patterns from existing tests.
- `client.ts` caches the token at module level: call `resetCsrfToken()` in `beforeEach`.
- `vitest.config.ts`: `exclude: [...configDefaults.exclude, 'e2e/**']`.

### E2E (Playwright)

- Dev dependency `@playwright/test`; script `"test:e2e": "playwright test"`.
- `playwright.config.ts`: `const port = Number(process.env.E2E_PORT ?? 4173)`; `testDir: 'e2e'`, Chromium project.
- `baseURL` `http://localhost:${port}/frontend/`, same `port` in the `webServer` command.
- `webServer`: `npm run build && npm run preview -- --port ${port} --strictPort`; `reuseExistingServer: false`.
- `vite.config.ts:74`: also return the build config when `isPreview` (no proxy, no env validation).
- `e2e/mock-cms.ts`: `mockCms(page, options)` registers `page.route` handlers on a mutable session state.
- Session state `'anonymous' | 'editor' | 'no_access'`; login route sets `editor`, logout sets `anonymous`.
- Catch-all on `**/api/**` returns 501 and records the URL; fixture asserts the list is empty.
- `e2e/fixtures.ts`: home pages per locale, recipes incl. one untranslated, providers list.
- Specs: `auth.spec.ts`, `browse.spec.ts`, `locale.spec.ts`, `config.spec.ts`.
- `config.spec.ts` routes `config.json` to `apiBaseUrl: 'http://cms.test'`; mock adds CORS headers.
- Dev-login e2e: not possible, the built app drops `DevLoginForm`; stays a unit test.
- Type checking: `tsconfig.e2e.json` (include `e2e`, `playwright.config.ts`; types `node`), referenced in `tsconfig.json`.
- `eslint.config.js`: block for `e2e/**`, `playwright.config.ts` with node globals, react-hooks off.
- `.gitignore`: `test-results/`, `playwright-report/`, `blob-report/`.

### CI workflows

- New `.github/workflows/ci.yml`, triggers `pull_request` and `push` to the default branch (`main`).
- Steps: checkout, setup-node, `npm ci`, `npm run lint`, `npm test`, `npm run build`, Playwright install, `npm run test:e2e`.
- `release.yml` keeps its test steps and gains the Playwright install and e2e step.
- Both: `actions/upload-artifact` of `playwright-report/` with `if: failure()` after the e2e step.
- Playwright config: `reporter: [['html', { open: 'never' }]]` so the report exists in CI.

### Trade-offs

- `page.route` mocking over MSW or a stub server: no extra dependency, per-test state (spec decision).
- webServer builds itself: never tests a stale `dist/`; costs one extra build in CI.
- `E2E_PORT` with `strictPort`: parallel worktrees set distinct ports; a clash fails loudly.
- Separate `ci.yml` over extending `release.yml`: PR feedback without release triggers; duplicates some steps.

## Implementation steps

1. Client unit tests: `src/api/client.test.ts`.
2. Config and locale unit tests: `src/config.test.ts`, `src/locale.test.ts`.
3. Recipe component tests: `src/test/fixtures.ts`, `RecipeList.test.tsx`, `RecipeDetail.test.tsx`.
4. Shell component tests: `HomeContent.test.tsx`, `LanguageSwitch.test.tsx`, `src/App.test.tsx`, `DevLoginForm.test.tsx`.
5. Preview without proxy: `vite.config.ts`; exclude `e2e/**`: `vitest.config.ts`.
6. Playwright scaffold (incl. `E2E_PORT`, HTML reporter): `package.json`, `package-lock.json`, `playwright.config.ts`, `tsconfig.e2e.json`, `tsconfig.json`, `eslint.config.js`, `.gitignore`.
7. Mock CMS and fixtures: `e2e/mock-cms.ts`, `e2e/fixtures.ts`.
8. Auth e2e: `e2e/auth.spec.ts` (401, 403, `auth_error`, no-access, provider login, logout).
9. Browse and locale e2e: `e2e/browse.spec.ts`, `e2e/locale.spec.ts` (hash open/back, switch, persisted, hash cleared).
10. Runtime config e2e: `e2e/config.spec.ts`.
11. Release pipeline: `.github/workflows/release.yml` adds `npx playwright install --with-deps chromium`, `npm run test:e2e`, failure artifact upload.
12. PR/push pipeline: new `.github/workflows/ci.yml` with lint, test, build, e2e, failure artifact upload.
13. Docs: `CLAUDE.md` (commands, tests paragraph, `E2E_PORT`), `.claude/rules/frontend.md:17`, `README.md`.

## Test strategy

- Every step ends with `npm run lint && npm run build && npm test`; from step 8 also `npm run test:e2e`.
- Check each new e2e test fails once by breaking the behaviour (e.g. wrong hash prefix).
- Check `E2E_PORT=4180 npm run test:e2e` runs alongside a second run on the default port.
- Pipelines: `ci.yml` verified by the PR itself; force one e2e failure to confirm the artifact; `release.yml` via a throwaway tag on a fork or temporary `workflow_dispatch`.

## Risks

- Playwright `use()` fixture calls may trip `react-hooks/rules-of-hooks`; hence react-hooks off for `e2e/`.
- CORS on fulfilled cross-origin responses: mock must send `Access-Control-Allow-Origin` and `-Credentials`.
- Mock drifts from the CMS; mitigated by typing fixtures with `src/api` types (needs `vite/client` types in `tsconfig.e2e.json`).
- `--with-deps` needs sudo on the runner; fine on `ubuntu-latest`, adds roughly a minute per workflow.
- Invalid `E2E_PORT` (NaN) should fail clearly; validate in `playwright.config.ts`.
