# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@~/.claude/architectures/recipes.md

The import above is the shared recipes architecture file; it resolves only if `~/.claude/architectures/recipes.md` is a symlink to `architectures/recipes.md` in the sibling recipes-roadmap repo (`ln -s "$PWD/../recipes-roadmap/architectures/recipes.md" ~/.claude/architectures/recipes.md`, after `mkdir -p ~/.claude/architectures`). Without it, Claude Code skips the import.

## Commands

```bash
npm ci
npm run dev     # vite dev server; proxies /api, /login, /complete, /disconnect, /admin, /media to recipes-cms on http://localhost:8080
npm run lint    # eslint .
npm run build   # tsc -b && vite build -> dist/
```

There is no test runner; `npm run lint` and `npm run build` (type check) are the verification steps, and CI runs both on `vX.Y.Z` tags. `npm version patch` bumps `package.json` and tags; `git push --follow-tags` triggers the GitHub release, which attaches the contents of `dist/` as a tarball.

## Architecture

React 19 + TypeScript + Vite + TanStack Query, a thin client for the sibling `../recipes-cms` Django/Wagtail API (see its README for endpoints). The app is built with `base: '/frontend/'`; the local recipes-cms compose setup downloads the latest GitHub release into a volume and serves it at `/frontend/` (use `npm run dev` against that compose backend to try unreleased changes).

- **Runtime config, not build-time**: `loadConfig()` in `src/config.ts` fetches `config.json` from next to `index.html` at startup, so one build deploys anywhere. `public/config.json` holds same-origin defaults (`apiBaseUrl: ""`); deployments overwrite it. `getConfig()` throws if called before `loadConfig()`.
- **API layer** (`src/api/`): `client.ts` wraps `fetch` with `credentials: 'include'` (auth is Django session cookies, cross-origin in production). Unsafe methods get an `X-CSRFToken` header fetched from `/api/csrf/` and cached, because the cookie belongs to the backend host and can't be read here; a 403 mentioning CSRF refreshes the token and retries once. Non-2xx responses throw `ApiError` with `status` and `body`. Per-resource modules (`home.ts`, `recipes.ts`) hold the response types and fetchers.
- **Auth flow**: `App.tsx` treats a 401/403 from the home query as "not logged in" and renders `LoginPrompt` instead of retrying. Under `npm run dev` only (`import.meta.env.DEV`), `LoginPrompt` also shows `DevLoginForm`, which posts to the CMS's `/api/dev-login/` (enabled by its dev settings) to sign in the local users from its `.env`; production builds contain no trace of it.
- **Recipes are multilingual**: `GET /api/recipes/` without `?locale=` returns `{ locales: { <code>: Recipe[] } }`, grouped by locale, not a flat array. Slugs are only unique per locale, so `RecipeList` selects the detail view through a URL hash of the form `#recipe-<locale>-<slug>` rather than routing.
- `RecipeDetail` renders backend-provided HTML (`preparation`, from the Wagtail rich text editor).
