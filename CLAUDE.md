# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@~/.claude/architectures/recipes.md

The import above is the shared recipes architecture file; it resolves only if `~/.claude/architectures/recipes.md` is a symlink to `architectures/recipes.md` in the sibling recipes-roadmap repo (`ln -s "$PWD/../recipes-roadmap/architectures/recipes.md" ~/.claude/architectures/recipes.md`, after `mkdir -p ~/.claude/architectures`). Without it, Claude Code skips the import.

## Commands

```bash
npm ci
npm run dev     # vite dev server; proxies /api, /api-auth, /login, /complete, /disconnect, /admin, /media to recipes-cms (default http://localhost:8080)
npm run lint    # eslint .
npm run build   # tsc -b && vite build -> dist/
```

`npm run dev` reads config-only variables (shell or gitignored `.env.local`, no `VITE_` prefix, never in the bundle; see README "Dev server target and port"): `RECIPES_CMS_PORT` (default 8080) targets the local stack on `http://localhost:<port>`; `RECIPES_CMS_URL` (an http(s) origin, e.g. a remote backend) takes precedence over it; `DEV_SERVER_PORT` defaults to the paired port `5173 + (RECIPES_CMS_PORT - 8080)` (8081 -> 5174), or 5173 with `RECIPES_CMS_URL`. The port is pinned (`strictPort`), because the dev server's origin must be in the backend's dev `CSRF_TRUSTED_ORIGINS` (recipes-cms trusts 5173 plus the paired port); otherwise CSRF-checked POSTs (e.g. logout) fail, while `/api/dev-login/` is exempt. Invalid values fail at startup. Example: `RECIPES_CMS_PORT=8081 npm run dev` serves `http://localhost:5174/frontend/` against the 8081 worktree stack.

There is no test runner; `npm run lint` and `npm run build` (type check) are the verification steps, and CI runs both on `vX.Y.Z` tags. `npm version patch` bumps `package.json` and tags; `git push --follow-tags` triggers the GitHub release, which attaches the contents of `dist/` as a tarball.

## Architecture

React 19 + TypeScript + Vite + TanStack Query, a thin client for the sibling `../recipes-cms` Django/Wagtail API (see its README for endpoints). The app is built with `base: '/frontend/'`; the local recipes-cms compose setup downloads the latest GitHub release into a volume and serves it at `/frontend/` (use `npm run dev` against that compose backend to try unreleased changes).

- **Runtime config, not build-time**: `loadConfig()` in `src/config.ts` fetches `config.json` from next to `index.html` at startup, so one build deploys anywhere. `public/config.json` holds same-origin defaults (`apiBaseUrl: ""`); deployments overwrite it. `getConfig()` throws if called before `loadConfig()`.
- **API layer** (`src/api/`): `client.ts` wraps `fetch` with `credentials: 'include'` (auth is Django session cookies, cross-origin in production). Unsafe methods get an `X-CSRFToken` header fetched from `/api/csrf/` and cached, because the cookie belongs to the backend host and can't be read here; a 403 mentioning CSRF refreshes the token and retries once. Non-2xx responses throw `ApiError` with `status` and `body`. Per-resource modules (`home.ts`, `recipes.ts`) hold the response types and fetchers.
- **Auth flow**: `App.tsx` treats a 401/403 from the home query as "not logged in" and renders `LoginPrompt` instead of retrying. Under `npm run dev` only (`import.meta.env.DEV`), `LoginPrompt` also shows `DevLoginForm`, which posts to the CMS's `/api/dev-login/` (enabled by its dev settings) to sign in the local users from its `.env`; production builds contain no trace of it.
- **Recipes are multilingual**: `GET /api/recipes/` without `?locale=` returns `{ locales: { <code>: Recipe[] } }`, grouped by locale, not a flat array. Slugs are only unique per locale, so `RecipeList` selects the detail view through a URL hash of the form `#recipe-<locale>-<slug>` rather than routing.
- `RecipeDetail` renders backend-provided HTML (`preparation`, from the Wagtail rich text editor).
