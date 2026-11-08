# Spec: fast CI on every push (recipes-frontend #17)

Sibling change: recipes-cms #34 (same spec there).

## Why

- Catch regressions on every push to every branch, not at PR or release time.
- Full-stack e2e stays in recipes-infrastructure on releases.

## Current state

- `ci.yml` runs on `pull_request` and pushes to `main` only.
- Steps: lint, vitest, build, Playwright e2e against the mocked CMS.
- Last green run took about 1 minute in total (browser install 20 s, e2e 8 s).

## Goals

- `ci.yml` triggers on `push` to all branches (not tags; `release.yml` keeps tags).
- Keep all steps, including Playwright e2e: it is fast enough for every push (user's rule: e2e on every push only if fast, else on release/PR).
- CLAUDE.md (and README if it mentions it) describes the new triggers.

## Non-goals

- Changes to `release.yml` or the tests themselves.
- Full-stack e2e here.

## Calls made by Claude (approved by user)

- Drop the `pull_request` trigger: a PR's head commit is already a push, so keeping it runs CI twice per commit.

## Left to the builder

- Optional cheap speedups (e.g. caching the Playwright browser), only if trivial.
