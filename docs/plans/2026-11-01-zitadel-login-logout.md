# Provider-driven login and fixed logout `next` (recipes-frontend issue #8)

## Context and goal

recipes-frontend `LoginPrompt.tsx` hardcodes `/login/auth0_openidconnect/`. recipes-cms (issue #5, pluggable auth) now exposes `GET /api/auth/providers/` returning `{"providers":[{"id","label","login_url"}]}` (only enabled providers, in `AUTH_PROVIDERS` order; `local` -> `/admin/login/`, `auth0` -> `/login/auth0_openidconnect/`, `zitadel` -> `/login/zitadel/`; verified in recipes-cms `src/oidc_auth/views.py`, `AuthProvidersView`, AllowAny, no auth). Refused logins redirect back to the login `next` with `auth_error=<code>` appended (recipes-cms `oidc_auth/middleware.py`; codes `email_missing|email_unverified|email_in_use|already_signed_in|login_failed`). Zitadel only accepts exactly registered post-logout URIs, so logout `next` must be the fixed frontend root, not `window.location.href`. Blocks Zitadel rollout on staging (recipes-infrastructure #5).

Goal: (1) one login link per provider, (2) messages for `auth_error`, (3) fixed logout `next`, (4) tests, which needs a minimal test runner (the architecture file and CLAUDE.md currently say "no test runner").

## Acceptance criteria

1. `LoginPrompt` fetches `/api/auth/providers/` and renders one link per provider, in response order, text = `label`, `href = apiUrl(login_url + "?next=" + encodeURIComponent(next))`. No hardcoded Auth0 link remains.
2. `next` for login is the current page URL without any `auth_error` param (so a retry does not accumulate `auth_error`s) and without the hash being lost needlessly (keep other params and hash).
3. While loading, a "Loading login options..." state shows; on request failure an error state (`role="alert"`) shows; an empty list shows a "no login method available" message.
4. If the URL has `?auth_error=<code>` with a known code, a `role="alert"` message for that code is shown above the links; an unknown code is ignored or shown as the `login_failed` text (decision: treat unknown as `login_failed`). Messages exist for all five codes. After display, `auth_error` is removed from the address bar via `history.replaceState` (keeps other params/hash).
5. `DevLoginForm` still renders only under `import.meta.env.DEV`.
6. Logout links in `HomeContent` and `NoAccessPrompt` use `next = encodeURIComponent(<origin> + import.meta.env.BASE_URL)` (i.e. `https://host/frontend/`), independent of current path, query and hash.
7. Tests (vitest) cover: one link per provider incl. order and encoded `next`; error state on failed request; each `auth_error` message; logout `next` fixed in both components even when location has query/hash.
8. `npm run lint`, `npm run build`, `npm test` pass; CI (`release.yml`) runs `npm test`.
9. CLAUDE.md "no test runner" statements are updated (see Risks for the architecture file).

## Design

### Test framework (minimal)
Dev deps: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` (only if needed; can skip). Extend `vite.config.ts` carefully: it returns two branches via `defineConfig(({command}) => ...)`; vitest reads the same config with `command: 'serve'`, which would run `loadEnv` and `pairedDevServerPort` and may throw on invalid env. Preferred: add a separate `vitest.config.ts` (`mergeConfig` not needed; just `defineConfig({ plugins:[react()], base:'/frontend/', test:{ environment:'jsdom', setupFiles:['./src/test/setup.ts'], globals:false, restoreMocks:true } })`). Setup file imports `@testing-library/jest-dom/vitest` and registers `cleanup`. Add `"test": "vitest run"` script. Add `"vitest/globals"`-free imports (explicit `import { describe, it, expect, vi } from 'vitest'`) so tsconfig `types` stays as is. `tsc -b` covers `src` including tests; ensure `vitest.config.ts` is added to `tsconfig.node.json` include (check its current include). Test files `src/**/*.test.tsx` colocated.

Test helpers: `src/test/render.tsx` wrapping in a fresh `QueryClientProvider` (retry false); `setConfig`: `loadConfig()` is runtime fetch and `getConfig()` throws before it, so tests mock `../config` (`vi.mock('../config', () => ({ getConfig: () => ({ apiBaseUrl: '' }) }))`) or stub `fetch` for config.json. Prefer mocking `getConfig`. Mock API with `vi.stubGlobal('fetch', ...)` returning JSON responses with `Content-Type: application/json` (client `parseBody` checks that header).

### Code changes
- `src/api/auth.ts` (new): `AuthProvider` type, `authProvidersQueryKey`, `fetchAuthProviders()` using `apiFetch<{providers: AuthProvider[]}>('/api/auth/providers/')` returning `.providers`. Note: client uses `credentials: 'include'`; CMS endpoint has no auth, fine; cross-origin CORS already configured for `/api/`.
- `src/auth/urls.ts` (new, small pure helpers, testable): `frontendRootUrl()` = `new URL(import.meta.env.BASE_URL, window.location.origin).href`; `logoutUrl()` = `apiUrl('/admin/logout/?next=' + encodeURIComponent(frontendRootUrl()))`; `loginNextUrl()` = `window.location.href` with `auth_error` stripped; `authErrorFromLocation()`; `AUTH_ERROR_MESSAGES: Record<code,string>`. Messages (suggested): email_missing "Your account provider did not share an email address."; email_unverified "Please verify your email address with your provider, then try again."; email_in_use "This email address is already used with a different login method. Use that method to sign in."; already_signed_in "You are already signed in with another account or this identity belongs to another user."; login_failed "Sign-in failed. Please try again.".
  - Single `logoutUrl()` used by both components removes duplication.
- `LoginPrompt.tsx`: `useQuery({queryKey, queryFn: fetchAuthProviders, retry: false or 1})`; render states; read `auth_error` once with `useState(() => ...)` initialiser, then `replaceState` in a `useEffect`. Wrap provider links in `<ul>`/same `auth-prompt` styling; minor additions in `App.css` only if needed. Link text = `label` (backend gives "Username and password" for local).
- `HomeContent.tsx`, `NoAccessPrompt.tsx`: replace `href` with `logoutUrl()`; keep `onClick={resetCsrfToken}` in HomeContent.
- `local` provider note: its `login_url` is `/admin/login/` (Wagtail admin), and `next` is honoured by Wagtail login. In dev mode both DevLoginForm and the local link may appear; acceptable.
- Vite dev proxy: `/api`, `/login`, `/admin` already proxied; no change. Under `npm run dev`, `BASE_URL` is `/frontend/` and origin is the dev server (`localhost:5173`), which matches `DEV_FRONTEND_ORIGINS`/redirect-host allowlist in the CMS.

### Trade-offs
- Separate `vitest.config.ts` vs. extending `vite.config.ts`: separate avoids the dev-env validation side effects and the `command !== 'serve'` branch.
- Stripping `auth_error` from the URL after reading: avoids stale errors on reload and on next login; small risk of StrictMode double effect (idempotent).
- Providers fetched via TanStack Query (consistent with project) instead of ad hoc `useEffect`.

## Implementation steps (each a commit)

1. `chore(test): add vitest, jsdom and testing-library` : deps, `vitest.config.ts`, setup file, `test` script, tsconfig include, one trivial smoke test; `release.yml` gets a `npm test` step after Lint; update CLAUDE.md Commands / "There is no test runner" paragraph and README if it mentions it.
2. `feat(auth): add providers api and url helpers` : `src/api/auth.ts`, `src/auth/urls.ts` with unit tests (`frontendRootUrl` under base `/frontend/`, `loginNextUrl` strips `auth_error`, codes mapping).
3. `fix(auth): log out to the fixed frontend root` : `HomeContent`, `NoAccessPrompt` use `logoutUrl()`; component tests (location set to `/frontend/?x=1#recipe-en-foo`, assert `href` ends with `next=<encoded origin/frontend/>`).
4. `feat(auth): render one login option per provider` : `LoginPrompt` states, `auth_error` messages; tests for order/encoded `next`, error state, empty list, each error code, URL cleanup, DevLoginForm absent in test mode if `import.meta.env.DEV` is true under vitest (note: vitest sets DEV true; mock/stub with `vi.stubEnv('DEV', false)` or mock `DevLoginForm`).
5. `docs: update CLAUDE.md for providers and test runner` (Architecture "Auth flow" bullet).
6. Verify: `npm run lint && npm run build && npm test`; manual check against the recipes-cms stack (`uv run invoke dev` in recipes-cms, `npm run dev` here): with `AUTH_PROVIDERS=local,auth0` two links; trigger `?auth_error=email_in_use` manually; logout lands on `/frontend/`. Whoever starts the stack shuts it down (`uv run invoke down`).

## Risks and open questions

- The shared architecture file (`recipes-roadmap/architectures/recipes.md`) says "No test runner: lint and build are the verification steps". It lives in recipes-roadmap and must be updated in a separate recipes-roadmap change (not done here). Confirm that adding vitest is approved.
- Post-logout redirect: the CMS `CustomLogoutView` validates `next` (see `safe_redirect_url`); confirm `<origin>/frontend/` passes it in production when frontend and CMS are on different origins (allowed hosts / `SOCIAL_AUTH_ALLOWED_REDIRECT_HOSTS`) and is registered as the Zitadel post-logout URI (recipes-infrastructure #5).
- `next` for login: issue says "current URL"; with Zitadel nothing requires it be fixed, but the CMS rejects unsafe `next` and falls back to the Wagtail admin login with a server-side message. Confirm that is acceptable.
- Exact user-facing wording of the five messages (proposal above); the CMS also has its own English messages in `oidc_auth/exceptions.py` that could be mirrored for consistency.
- Whether to fall back to a hardcoded Auth0 link if the providers request fails (plan says no: show an error).
- Whether the project wants `@testing-library/user-event`; not needed for link-only tests.
- Node/vitest versions must be compatible with Vite 8 (`vite ^8.0.10`); verify the vitest release supporting Vite 8 at install time.
- I could not run `gh` or shell commands in this session; the issue text was read via the GitHub web page summary, so re-check the issue for details not captured here.
