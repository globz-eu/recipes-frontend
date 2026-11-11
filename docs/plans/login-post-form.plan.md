# Plan: start social logins with a POST form

Spec: `docs/plans/login-post-form.spec.md`. Part of globz-eu/recipes-cms#39.

### Context

- `LoginPrompt.tsx:42` renders `<a href={providerLoginUrl(login_url)}>`, a GET.
- social-auth-app-django 7.2 rejects GET on `/login/<backend>/`; released CMS has 5.9.0.
- `getCsrfToken` (`src/api/client.ts:21`) caches the token; `resetCsrfToken` drops it.
- `next` comes from `loginNextUrl()` (`src/auth/urls.ts:28`), without `auth_error`.
- Local provider `login_url` is `/admin/login/` (Wagtail login page): it stays a GET link.
- Vite proxies `/login` (`vite.config.ts:6`); nginx `location /` proxies all methods.
- CMS dev trusts `DEV_FRONTEND_ORIGINS` (`settings/dev.py:27`); `dev-stack.sh env --port 8082` sets 5175.

### Files

- `src/api/auth.ts`: `fetchFreshCsrfToken()` = `resetCsrfToken()` then `getCsrfToken()`.
- `src/auth/urls.ts`: `providerLoginAction(loginPath)` = `apiUrl(loginPath)`.
- `src/components/ProviderLoginForm.tsx` (new): POST form, hidden `csrfmiddlewaretoken`, `next`.
- `src/components/LoginPrompt.tsx`: form for social providers, link for `id === "local"`.
- `src/App.css`: style the submit button like the current link.
- `tests/unit/components/ProviderLoginForm.test.tsx` (new), `LoginPrompt.test.tsx`, `tests/unit/api/auth.test.ts`.
- `tests/e2e/mock-cms.ts`, `tests/e2e/auth.spec.ts`.

### Implementation steps

1. Add `fetchFreshCsrfToken` and `providerLoginAction`, with unit tests.
2. Add `ProviderLoginForm`: `onSubmit` prevents default, awaits token, sets ref'd hidden input, calls `form.submit()`.
3. Disable the button while fetching; on failure show `AUTH_ERROR_MESSAGES.login_failed` with `role="alert"`.
4. Use it in `LoginPrompt` for non-local providers; update `LoginPrompt.test.tsx` (buttons vs. links).
5. Match the current look in `App.css`.
6. `mock-cms.ts`: mock `/api/csrf/` (CORS); login route reads `next` from POST body.
7. `auth.spec.ts`: click the Auth0 button, assert POST with token, return to app.
8. Update `CLAUDE.md` "Auth flow" bullet (forms, fresh token, local stays a link).

### Tests

- Form `action` is `https://cms.example/login/zitadel/`, method `post`, `next` has no `auth_error`.
- Submit fetches `/api/csrf/` each click, even with a cached token, then calls `submit()`.
- jsdom lacks `HTMLFormElement.prototype.submit`: spy on it with `vi.spyOn(...).mockImplementation`.
- Token fetch 500: alert shows `login_failed` text, `submit` not called.
- Local provider stays a link with `?next=`.

### Acceptance criteria

1. `npm run format`, `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e` pass.
2. Each social provider POSTs `csrfmiddlewaretoken` and `next` to its `login_url`.
3. Token failure shows the `login_failed` message inline; no navigation.
4. Dev stack on 8082 (`dev-stack.sh env --port 8082`, released CMS with social-auth 5.9.0):
5. `RECIPES_CMS_PORT=8082 npm run dev` on `localhost:5175/frontend/`: social sign-in returns to the page.
6. `npm run build` plus `npm run stack:dist`, at `localhost:8082/frontend/`: same result.
7. `?auth_error=` messages still appear after a refused login.
8. PR body says `Part of globz-eu/recipes-cms#39`; stack stopped with `npm run stack:down`.

### Risks

- Pop-up blockers do not apply: `form.submit()` is top-level navigation.
- Token rotates on login; fetching per click avoids a stale token.
- Staging is cross-origin same-site; Lax CSRF cookie is sent on top-level POST.

### Open questions

- Spec says "each provider" posts; plan keeps `local` (`/admin/login/`) a GET link. Confirm.
- Detecting local by `id === "local"` couples to the CMS id; acceptable without a new API field?
