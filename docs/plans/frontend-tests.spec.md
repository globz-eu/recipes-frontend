# Spec: unit and e2e tests for the frontend

Ticket: recipes-frontend issue #3, "Add e2e and unit tests to the frontend".

## Intent

- Catch regressions in what the frontend does for users without a manual click-through.
- The frontend is a thin client of the CMS API; the tests pin its behaviour, not its looks.

## Goals

- **E2E tests** run the built app in a real browser against a mock CMS API.
  - Covers: login prompt (401/403), no-access prompt, browsing the recipe list, opening a recipe (URL hash), switching language, logout.
  - No compose stack and no real CMS needed; they run offline.
- **Unit tests** cover business behaviour (vitest, existing setup):
  - API client: CSRF token fetch and caching, one refresh and retry on a CSRF failure, `ApiError`, no-access detection, `apiBaseUrl` handling.
  - Locale: stored choice, browser language, fallback to English, storage unavailable.
  - Components with logic: recipe list, recipe detail, home content, language switch, login/no-access prompts, dev-login form (user decision: required, not optional).
  - Existing tests stay; gaps only are filled.
- `npm test` runs the unit tests, `npm run test:e2e` the e2e tests.
- CI (`release.yml`) runs both before building the release.
- CI (new `ci.yml`) runs lint, unit tests, build and e2e on pull requests and pushes to the default branch (user decision).
- The e2e preview port is overridable via `E2E_PORT`, default 4173, so parallel worktrees do not collide (user decision).
- Both workflows upload the Playwright report as an artifact when e2e tests fail (user decision).
- `CLAUDE.md` and `.claude/rules/frontend.md` are updated: the rules file still says "there are no tests".

## Non-goals

- Bulk upload: the frontend has no upload UI; it is out of scope (decided with the user).
- Layout and CSS are not tested (decided with the user).
- No e2e run against the real CMS compose stack.
- No coverage threshold.

## Constraints

- Follow the frontend conventions in `.claude/rules/frontend.md` (strict TypeScript, no semicolons, single quotes).
- `config.json` stays the only runtime configuration; the e2e tests must not add build-time settings.
- The mock API mirrors the CMS response shapes (snake_case); check `../recipes-cms` serializers and views for them.

## Decisions

- User: e2e through a browser against a mock CMS API; unit tests for business functionality; no CSS tests; no bulk upload.
- User: add a PR/push workflow `ci.yml` (lint, unit, build, e2e); `release.yml` keeps its test steps too.
- User: the e2e port is overridable via `E2E_PORT` (default 4173), used for both the `webServer` command and `baseURL`.
- User: CI uploads the Playwright report as an artifact when e2e fails, in both workflows.
- User: the `DevLoginForm` unit test is part of the ticket.
- My call: Playwright (Chromium only) as the e2e runner, with the mock API implemented through Playwright request interception, so no extra server or dependency is needed.
- My call: e2e tests serve the built app (`vite preview` on `/frontend/`) so they test what is released.
- My call: e2e tests live in `e2e/`, outside `src/`, and are excluded from vitest.
- My call: the CI job installs Chromium with `npx playwright install --with-deps chromium`.

## Left to the builder

- File layout of the mock API and the shared fixtures.
- Which components get their own unit tests, as long as the goals above are covered.
- Whether the dev-login form (dev settings only) gets an e2e case.
