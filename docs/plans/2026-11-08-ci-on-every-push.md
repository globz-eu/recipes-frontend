# Plan: fast CI on every push (recipes-frontend #17)

Spec: `docs/plans/2026-11-08-ci-on-every-push.spec.md`.

## Files to change

- `.github/workflows/ci.yml`, lines 3-7 (`on:` block).
- `CLAUDE.md`, line 27 (CI trigger wording).
- README: no CI trigger wording found (grep), so no change.

## Acceptance criteria

1. `ci.yml` has no `pull_request` trigger.
2. `ci.yml` triggers on `push` to every branch.
3. Pushing a `vX.Y.Z` tag does not start `CI`; `release.yml` still does.
4. All steps stay: lint, test, build, Playwright install, e2e, report upload.
5. `CLAUDE.md` line 27 says CI runs on pushes to every branch.

## Design

- Use `push:` with `branches: ["**"]`, replacing `main`.
- A `push` filter with only `branches` already skips tag pushes.
- `["**"]` is not needed to exclude tags; it only makes the intent explicit.
- Alternative: bare `push:` would also run on tags, duplicating `release.yml` checks. Reject.
- Dropping `pull_request` means fork PRs get no CI. Accepted in the spec (single-owner repo).

## Steps

1. Edit `ci.yml` `on:` to `push: branches: ["**"]`; commit "Run CI on every branch push".
2. Update `CLAUDE.md` line 27; commit "Document CI triggers".
3. Skip Playwright browser caching (spec: only if trivial; run is ~1 min).

## Verification

- `actionlint .github/workflows/ci.yml` if installed.
- Else `python3 -c "import yaml;yaml.safe_load(open('.github/workflows/ci.yml'))"`.
- Push the feature branch: `CI` run appears for that branch.
- Open a PR: no second `CI` run on the PR.
- `grep -n "pull request" CLAUDE.md README.md` shows no stale wording.

## Open questions

- None. Optionally note in the `CLAUDE.md` edit that `release.yml` handles tags.
