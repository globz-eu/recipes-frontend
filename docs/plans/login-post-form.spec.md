# Spec: start social logins with a POST form

Part of globz-eu/recipes-cms#39 (social-auth-app-django 7.2 makes login starts POST-only with CSRF).
Companion spec: recipes-cms `docs/plans/social-auth-7.spec.md`.

### Intent

- recipes-cms is upgrading to social-auth-app-django 7.2, where `/login/<backend>/` rejects GET.
- `LoginPrompt.tsx` must start logins with a CSRF-protected POST instead of a link.
- Users see the same buttons, redirects and `auth_error` messages.

### Non-goals / anti-goals

- No login UX redesign, no new `auth_error` codes.
- No deploy window where frontend sign-in is broken: this PR is merged and released before the CMS one.

### Behaviour

- Each provider from `GET /api/auth/providers/` renders a form POSTing to `login_url` (top-level navigation).
- Form carries `csrfmiddlewaretoken` and `next` (as `providerLoginUrl` sets it today).
- On click, fetch a fresh token from `GET /api/csrf/` (`csrfToken`), then submit; no stale cached token.
- Token fetch failure shows the existing `login_failed` message inline.
- `login_url` shape is unchanged; no new API field.
- Works against today's CMS 5.9.0 too (`maybe_require_post` accepts POST), so it can deploy first.
- Cross-origin but same-site in staging (`*.globz.dev`): the Lax CSRF cookie is sent; the origin is in `CSRF_TRUSTED_ORIGINS`.

### Done when

- `npm test`, `npm run lint`, `npm run build` pass; tests cover the form and the token-failure path.
- Manual sign-in with a social provider works on the dev stack via `npm run dev` (Vite proxy) and via nginx (`stack:dist`).
- PR says `Part of globz-eu/recipes-cms#39`.

### Left to the builder

- Form markup/CSS, keeping the current look.
