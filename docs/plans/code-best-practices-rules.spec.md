# Spec: code best-practices rules (recipes-frontend #13)

Adapts the clean-code and workflow rules of recipes-infrastructure (PR #19) to this React app, lint-enforced wherever possible.

### Intent

- Agents write clean, simple, modular code here without being told each time (issue #13).
- Every principle is stated explicitly: simplicity, YAGNI, DRY, separation of concerns, modularity, naming, and more.
- Rules prepare for issue #3: once e2e tests exist, every new feature gets one.

### Goals

- New `.claude/rules/code-quality.md`: general principles, each with an example from this repo.
- Sections: Simplicity/YAGNI, DRY, Separation of concerns, Size limits, Modularity, Naming, Enums over boolean flags, Comments, Types, Testing, Before finishing, Workflow, Committing changes.
- `.claude/rules/frontend.md` keeps only repo-specific rules (API client, config, URL hash, rich text); no overlap with `code-quality.md`.
- Every rule a linter can check is enforced by `npm run lint` (ESLint flat config, `--max-warnings 0`).
- Existing code is fixed so lint passes with no `eslint-disable`.

### Decisions (user)

- Lint-enforce every rule that a linter can check.
- Same size limits as recipes-infrastructure: files ≤ 200 lines, functions ≤ 60, complexity ≤ 10, depth ≤ 3, ≤ 3 params, ≤ 3 nested callbacks.
- Testing rule: new features and behaviour changes get Vitest tests; once an e2e suite exists, new user-facing features also get e2e tests.
- No test backfill here; issue #3 writes the missing tests.
- Commit style switches to a short, capitalised imperative verb, no conventional prefix.

### Decisions (my calls)

- Line limits skip blank lines and comments; JSX counts; a component's props object is one parameter.
- Shape rules: `no-nested-ternary`, `no-else-return`, `no-param-reassign`.
- Modules: named exports only (tool configs exempted in the ESLint config); no barrel `index.ts`; no import cycles (`eslint-plugin-import-x`).
- Separation of concerns enforced: `fetch` only in `src/api/client.ts` and `src/config.ts`; components don't import `src/api/client.ts`; `dangerouslySetInnerHTML` only in `RecipeDetail`.
- Types: `no-explicit-any` (tests too), `consistent-type-imports`; enums already blocked by `erasableSyntaxOnly`.
- Boolean names start with `is`/`has`/`can`/`should` via typed `naming-convention`; type-aware linting accepted despite slower lint.
- API-shaped properties (mirrored snake_case fields) are exempt from the boolean prefix rule.
- Unit tests move out of `src/` into `tests/unit/` (user), mirroring `src/` paths; shared setup (`src/test/`) moves to `tests/unit/support/`.
- `tests/e2e/` is left for issue #3; `src/` never imports from `tests/`; tests are type-checked by `npm run build`.
- `eslint-disable` needs a `-- reason`; unused disables are errors (`eslint-comments` plugin, `reportUnusedDisableDirectives`).
- Formatting by Prettier (user): no semicolons, double quotes (user), 2-space indent; `npm run format` writes, `npm run lint` checks (`prettier --check`).
- `eslint-config-prettier` turns off ESLint rules that conflict with Prettier; no `@stylistic`.
- Enum helper (`EnumValue`, `isEnumValue`) added only with the first enum.
- Before finishing: `npm run lint`, `npm run build`, `npm test`; fix the stale "there are no tests" line.
- `CLAUDE.md`: link both rules files, update lint description and commit style.

### Constraints

- Behaviour-neutral: `npm run build` and `npm test` stay green; test count same or higher.
- Moving tests changes only imports and paths, not assertions.
- Lint covers `src/`, tests and root configs; ignores `dist/`, `node_modules/`.

### Non-goals

- Writing missing unit or e2e tests (issue #3).
- Changing CI (`release.yml`) beyond what lint already runs.

### Left to the builder

- Exact plugin rule names and options.
- How any file over a limit is split, and boolean renames.
- Where the written-only rules (YAGNI, DRY timing, comment quality) get their examples.
