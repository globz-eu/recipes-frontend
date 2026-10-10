---
paths:
  - "src/**/*.{ts,tsx}"
---

# Frontend conventions

- **All backend calls go through `src/api/client.ts`** (`apiFetch`, `apiPost`, …). Never call `fetch` directly for the API: the wrapper adds `credentials: 'include'`, the CSRF header and `ApiError` handling. Build URLs with `apiUrl()` so `apiBaseUrl` from `config.json` is respected.
- **One module per backend resource in `src/api/`**, exporting the response types, a `<resource>QueryKey` constant and a `fetch<Resource>` function. Components use them with `useQuery({ queryKey, queryFn })`; don't hand-write query keys or fetch in components.
- **Mirror the API shape in types**, snake_case fields included (`preparation_time`, `translation_key`). Don't rename fields on the client. Check the response shape in `../recipes-cms` (README, serializers and views) before changing a type.
- **Never read config at build time.** Environment-specific values belong in `config.json` and `AppConfig` in `src/config.ts`, read through `getConfig()` after `loadConfig()` has run.
- **Treat 401/403 as "not logged in"**, not as an error to retry (see `App.tsx`). Use the same `retry` rule for any new top-level query that gates the UI.
- **Selection state lives in the URL hash** (`#recipe-<locale>-<slug>`, read with `useSyncExternalStore`); there is no router. Slugs are only unique per locale, so never identify a recipe by slug alone.
- `dangerouslySetInnerHTML` is only for backend-rendered Wagtail rich text (`preparation`). Don't use it for any other field.
- TypeScript is strict about module syntax: use `import type` for type-only imports (`verbatimModuleSyntax`), no enums or namespaces (`erasableSyntaxOnly`), and no unused locals or parameters.
- Style: no semicolons, single quotes, 2-space indent, named exports for components. Components live in `src/components/`, one per file, named after the component.
- Finish every change with `npm run lint && npm run build`; there are no tests.
