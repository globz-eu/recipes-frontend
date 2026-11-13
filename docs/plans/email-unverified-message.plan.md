# Plan: tell unverified users to ask an admin

Source of truth: `docs/plans/email-unverified-message.spec.md` (globz-eu/recipes-cms#47).

## Acceptance criteria

1. `AUTH_ERROR_MESSAGES.email_unverified` equals the spec wording exactly.
2. A vitest test asserts that exact text.
3. `npm test`, `npm run lint` and `npm run build` pass.
4. No new `auth_error` codes; `AuthErrorCode` and URL handling unchanged.

## Design

- Change: `src/auth/urls.ts:7`, the `email_unverified` string only.
- Test: `tests/unit/auth/urls.test.ts`, the `describe("AUTH_ERROR_MESSAGES")` block (line 71), mirroring `src/auth/urls.ts`.
- `LoginPrompt` (`src/components/LoginPrompt.tsx:34`) and its tests read the map, so they need no change.
- Prettier may wrap the longer string onto its own line, as `email_in_use` does (`src/auth/urls.ts:8-9`).

## Implementation steps

1. Branch off `main` (e.g. `feature/email-unverified-message`); no commit on `main`.
2. Update `email_unverified` in `src/auth/urls.ts:7` to the spec text.
3. Add a test in `tests/unit/auth/urls.test.ts` asserting `AUTH_ERROR_MESSAGES.email_unverified` is the new text.
4. Run `npm run format`, then `npm test`, `npm run lint`, `npm run build`.
5. Commit as one imperative commit (e.g. `Ask unverified users to contact an administrator`), no prefix.
6. Open the PR with `Part of globz-eu/recipes-cms#47` in the body.

## Risks

- Wording must match recipes-cms `EmailNotVerified.message`; merge order is free, but both must ship the same text.
- Straight apostrophe in "didn't" must be kept so the test string matches the spec.
