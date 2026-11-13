# Spec: tell unverified users to ask an admin

Part of globz-eu/recipes-cms#47 (refused Auth0 logins now end the Auth0 session).
Companion spec: recipes-cms `docs/plans/auth0-refusal-logout.spec.md`.

### Intent

- Users refused with `auth_error=email_unverified` learn how to get out: verify, or ask an admin to resend the email.
- The CMS no longer resends verification emails itself (no Auth0 `update:users` credential).

### Change

- `src/auth/urls.ts` `AUTH_ERROR_MESSAGES.email_unverified`: "Please verify your email address with your provider. If you didn't get a verification email, ask an administrator to resend it."
- Keep that wording in sync with recipes-cms `EmailNotVerified.message`.
- No new codes; the `auth_error` URL contract stays.

### Done when

- `npm test`, `npm run lint`, `npm run build` pass; a test asserts the new text.
- PR says `Part of globz-eu/recipes-cms#47`; it can merge before or after the recipes-cms PR.
