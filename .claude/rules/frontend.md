---
paths:
  - "src/**/*.{ts,tsx}"
---

# Frontend conventions

- **`src/api/client.ts` is the API wrapper** (`apiFetch`, `apiPost`, …): it adds `credentials: 'include'`, the CSRF header and `ApiError` handling. `apiUrl()` respects `apiBaseUrl` from `config.json`; the URL helpers built on it are `providerLoginUrl` and `logoutUrl` (`src/auth/urls.ts`).
- **One module per backend resource in `src/api/`**, exporting the response types, a `<resource>QueryKey` constant and a `fetch<Resource>` function. Use them with `useQuery({ queryKey, queryFn })`; don't hand-write query keys.
- **Mirror the API shape in types**, snake_case fields included (`preparation_time`, `translation_key`). Don't rename fields on the client. Check the response shape in `../recipes-cms` (README, serializers and views) before changing a type.
- **Never read config at build time.** Environment-specific values belong in `config.json` and `AppConfig` in `src/config.ts`, read through `getConfig()` after `loadConfig()` has run.
- **Treat 401/403 as "not logged in"**, not as an error to retry. `isLoginRequiredError` (`src/api/errors.ts`) decides this; use it in the `retry` rule for any new top-level query that gates the UI.
- **Selection state lives in the URL hash** (`#recipe-<locale>-<slug>`, read with `useSyncExternalStore`); there is no router. Slugs are only unique per locale, so never identify a recipe by slug alone.
- **`preparation` is the only rich text field** (Wagtail-rendered HTML); every other field is plain text.
- Components live in `src/components/`.
