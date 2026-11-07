# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@~/.claude/architectures/recipes.md

The import above is the shared recipes architecture file; it resolves only if `~/.claude/architectures/recipes.md` is a symlink to `architectures/recipes.md` in the sibling recipes-roadmap repo (`ln -s "$PWD/../recipes-roadmap/architectures/recipes.md" ~/.claude/architectures/recipes.md`, after `mkdir -p ~/.claude/architectures`). Without it, Claude Code skips the import.

## Commands

```bash
npm ci
npm run dev     # vite dev server; proxies /api, /api-auth, /login, /complete, /disconnect, /admin, /media to recipes-cms (default http://localhost:8080)
npm run lint    # eslint . --max-warnings 0 && prettier --check .
npm run format  # prettier --write . (run before lint)
npm run build   # tsc -b && vite build -> dist/
npm test        # vitest run (jsdom + Testing Library; config in vitest.config.ts, tests in tests/unit)
npm run test:e2e  # playwright test: builds, serves dist/ on E2E_PORT (default 4173); config in playwright.config.ts, specs in tests/e2e
```

`npm run dev` reads config-only variables (shell or gitignored `.env.local`, no `VITE_` prefix, never in the bundle; see README "Dev server target and port"): `RECIPES_CMS_PORT` (default 8080) targets the local stack on `http://localhost:<port>`; `RECIPES_CMS_URL` (an http(s) origin, e.g. a remote backend) takes precedence over it; `DEV_SERVER_PORT` defaults to the paired port `5173 + (RECIPES_CMS_PORT - 8080)` (8081 -> 5174), or 5173 with `RECIPES_CMS_URL`. The port is pinned (`strictPort`), because the dev server's origin must be in the backend's dev `CSRF_TRUSTED_ORIGINS` (recipes-cms trusts 5173 plus the paired port); otherwise CSRF-checked POSTs (e.g. logout) fail, while `/api/dev-login/` is exempt. Invalid values fail at startup. Example: `RECIPES_CMS_PORT=8081 npm run dev` serves `http://localhost:5174/frontend/` against the 8081 worktree stack.

Tests are vitest files in `tests/unit/**/*.test.{ts,tsx}`, mirroring `src/` (setup in `tests/unit/support/setup.ts`). E2E specs are Playwright tests in `tests/e2e/`, run in Chromium against the built app served by `vite preview` at `/frontend/` on `E2E_PORT` (default 4173; give each parallel worktree its own port). The CMS API is mocked by request interception (`tests/e2e/mock-cms.ts`), and any request without a mock fails the test; `npx playwright install chromium` is a one-time setup. Run `npm run format` first (it writes); `npm run lint` (ESLint with the size, shape and boundary rules plus the Prettier check), `npm run build` (type check, also of `tests/`), `npm test` and `npm run test:e2e` are the verification steps. CI (`.github/workflows/ci.yml`) runs them on pull requests and pushes to `main`; `release.yml` runs them on `vX.Y.Z` tags before packaging. Both upload `playwright-report/` when e2e fails. `npm version patch` bumps `package.json` and tags; `git push --follow-tags` triggers the GitHub release, which attaches the contents of `dist/` as a tarball.

## Architecture

React 19 + TypeScript + Vite + TanStack Query, a thin client for the sibling `../recipes-cms` Django/Wagtail API (see its README for endpoints). The app is built with `base: '/frontend/'`; the local recipes-cms compose setup downloads the latest GitHub release into a volume and serves it at `/frontend/` (use `npm run dev` against that compose backend to try unreleased changes).

- **Runtime config, not build-time**: `loadConfig()` in `src/config.ts` fetches `config.json` from next to `index.html` at startup, so one build deploys anywhere. `public/config.json` holds same-origin defaults (`apiBaseUrl: ""`); deployments overwrite it. `getConfig()` throws if called before `loadConfig()`.
- **API layer** (`src/api/`): `client.ts` wraps `fetch` with `credentials: 'include'` (auth is Django session cookies, cross-origin in production). Unsafe methods get an `X-CSRFToken` header fetched from `/api/csrf/` and cached, because the cookie belongs to the backend host and can't be read here; a 403 mentioning CSRF refreshes the token and retries once. Non-2xx responses throw `ApiError` (defined with `isNoAccessError` and `isLoginRequiredError` in `src/api/errors.ts`) with `status` and `body`. Per-resource modules (`home.ts`, `recipes.ts`) hold the response types and fetchers.
- **Auth flow**: `App.tsx` treats a 401/403 from the home query as "not logged in" and renders `LoginPrompt` instead of retrying. `LoginPrompt` lists one link per provider from the CMS's `GET /api/auth/providers/` (response order, `providerLoginUrl(loginPath)` in `src/auth/urls.ts` gives `login_url` plus `?next=<current URL without auth_error>`; a failed request shows an error, there is no hardcoded fallback), shows a message for a refused login's `?auth_error=<code>` and then removes it from the address bar. Logout links use `logoutUrl()` (`src/auth/urls.ts`), whose `next` is always the frontend root, because identity providers only accept registered post-logout URIs. Under `npm run dev` only (`import.meta.env.DEV`), `LoginPrompt` also shows `DevLoginForm`, which posts to the CMS's `/api/dev-login/` (enabled by its dev settings) to sign in the local users from its `.env`; production builds contain no trace of it.
- **Recipes are multilingual**: `GET /api/recipes/` without `?locale=` returns `{ locales: { <code>: Recipe[] } }`, grouped by locale, not a flat array. Slugs are only unique per locale, so `RecipeList` selects the detail view through a URL hash of the form `#recipe-<locale>-<slug>` rather than routing.
- `RecipeDetail` renders backend-provided HTML (`preparation`, from the Wagtail rich text editor).

## Conventions

Read both rules files before changing code; ESLint enforces the measurable parts.

- [`.claude/rules/code-quality.md`](.claude/rules/code-quality.md): simplicity, DRY, separation of concerns, size limits, modularity, naming, enums, comments, types, testing, before finishing, workflow, commit style.
- [`.claude/rules/frontend.md`](.claude/rules/frontend.md): repo-specific rules (API client, config, URL hash, rich text).
- Commit messages: short, capitalised imperative verb, no prefix (`Move API errors into their own module`).
