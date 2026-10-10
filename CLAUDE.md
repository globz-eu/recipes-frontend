# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm ci
npm run dev     # vite dev server; proxies /api, /login, /complete, /disconnect, /admin, /media to recipes-cms on http://localhost:8080
npm run lint    # eslint .
npm run build   # tsc -b && vite build -> dist/
```

There is no test runner; `npm run lint` and `npm run build` (type check) are the verification steps, and CI runs both on `vX.Y.Z` tags. `npm version patch` bumps `package.json` and tags; `git push --follow-tags` triggers the GitHub release, which attaches the contents of `dist/` as a tarball.

## Architecture

React 19 + TypeScript + Vite + TanStack Query, a thin client for the sibling `../recipes-cms` Django/Wagtail API (see its README for endpoints). The app is built with `base: '/frontend/'`; the local recipes-cms compose setup serves `../recipes-frontend/dist` at `/frontend/`, so rebuilding `dist` changes what that environment serves.

- **Runtime config, not build-time**: `loadConfig()` in `src/config.ts` fetches `config.json` from next to `index.html` at startup, so one build deploys anywhere. `public/config.json` holds same-origin defaults (`apiBaseUrl: ""`); deployments overwrite it. `getConfig()` throws if called before `loadConfig()`.
- **API layer** (`src/api/`): `client.ts` wraps `fetch` with `credentials: 'include'` (auth is Django session cookies, cross-origin in production). Unsafe methods get an `X-CSRFToken` header fetched from `/api/csrf/` and cached, because the cookie belongs to the backend host and can't be read here; a 403 mentioning CSRF refreshes the token and retries once. Non-2xx responses throw `ApiError` with `status` and `body`. Per-resource modules (`home.ts`, `recipes.ts`) hold the response types and fetchers.
- **Auth flow**: `App.tsx` treats a 401/403 from the home query as "not logged in" and renders `LoginPrompt` instead of retrying.
- **Recipes are multilingual**: `GET /api/recipes/` without `?locale=` returns `{ locales: { <code>: Recipe[] } }`, grouped by locale, not a flat array. Slugs are only unique per locale, so `RecipeList` selects the detail view through a URL hash of the form `#recipe-<locale>-<slug>` rather than routing.
- `RecipeDetail` renders backend-provided HTML (`preparation`, from the Wagtail rich text editor).
