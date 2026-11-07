# Clean, simple, modular code

These rules apply to every change. ESLint enforces the measurable ones (`npm run lint`). Don't
silence a lint error to get past it. Restructure the code instead. An `eslint-disable` is only
acceptable for a signature you don't control (e.g. a library callback), and it needs a `-- reason`.
Repo-specific rules (API client, config, URL hash, rich text) are in `frontend.md`.

## Simplicity / YAGNI

- Write the simplest code that solves the current requirement. No speculative config keys,
  options, extension points or abstractions "for later".
- Don't add a dependency for something a few lines of code can do.
- Prefer early returns over nesting. No `else` after `return`. No nested ternaries.
- Prefer pure functions: `recipesForLocale` only maps its arguments to a result. Keep side
  effects (`fetch`, `window`, the clock) at the edges: `src/api/client.ts` talks to the network,
  `auth/urls.ts` reads `window.location`.
- Don't reassign parameters. Return new values.

## DRY

- Extract a helper on the second real use, or earlier when a name explains the logic better
  than the code does. `isLoginRequiredError` (`src/api/errors.ts`) decides "not logged in" for both
  the `retry` rule and the render branch in `App.tsx`; `logoutUrl()` is shared by `HomeContent` and
  `NoAccessPrompt`.
- Similar-looking code with different reasons to change is not duplication. Don't merge it.

## Separation of concerns

- `fetch` only in `src/api/client.ts` and `src/config.ts` (lint-enforced). Components and
  `App.tsx` use `src/api/<resource>.ts` modules and never import `client.ts`.
- Components render and handle events; fetching, URL building and error classification live in
  `src/api/` and `src/auth/`.
- `dangerouslySetInnerHTML` only in `RecipeDetail` (lint-enforced).
- `src/` never imports from `tests/` (lint-enforced).

## Size limits (lint-enforced)

- Files ≤ 200 lines, functions ≤ 60 lines, cyclomatic complexity ≤ 10, nesting depth ≤ 3,
  ≤ 3 parameters, ≤ 3 nested callbacks. Blank lines and comments don't count; JSX does.
- Tests get the same limits; `describe`/`it` callbacks are functions too.
- A component's props object counts as one parameter. Over 3 parameters elsewhere: pass a single
  options object with a named interface.
- Approaching a limit means a function or module does too much. Split it by responsibility, not
  by line count: the ordering loops of `RecipeList` moved into `recipesForLocale`.

## Modularity

- One responsibility per module. Name the file after its main export (`RecipeList.tsx` exports
  `RecipeList`).
- Named exports only. No default exports (the tool configs `eslint.config.js`, `vite.config.ts`,
  `vitest.config.ts`, `playwright.config.ts` are exempt) and no barrel `index.ts` files. Import the module directly.
- Only export what other modules use. Tests import the real exports, so don't export internals
  just to test them.
- Dependencies point one way: `main.tsx` → `App.tsx` → components → `src/api/` and `src/auth/`.
  No import cycles (lint-enforced).

## Naming

- Use declarative names that say what something is or does: `authErrorFromLocation`,
  `recipesForLocale`, `isLoginRequiredError`. No abbreviations or bare generic names (`data`,
  `util`, `helper`, `manager`, `tmp`) in your own code; handlers name what they handle. Names a
  library gives you stay (TanStack Query's `data`).
- Booleans read as questions and start with `is`, `has`, `can` or `should`: `isSubmitting`,
  `isBareOrigin` (lint-enforced for variables, parameters and own type properties). Properties
  mirroring the API in snake_case are exempt, as they keep the backend's names.
- Constants with units or role in the name: `HASH_PREFIX`.

## Enums over boolean flags

Don't use boolean flags (parameters or state) when an enum is an option. Use `as const` objects
with an `EnumValue` type, in `src/enum.ts` (add it with the first enum):

```ts
type EnumValue<T> = T[keyof T]

function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
): value is EnumValue<T> {
  return (Object.values(enumObject) as unknown[]).includes(value)
}

const AuthState = {
  Anonymous: "anonymous",
  SignedIn: "signed-in",
} as const
type AuthState = EnumValue<typeof AuthState>
```

Validate untrusted strings with `isEnumValue(AuthState, value)`. No TypeScript `enum`
(`erasableSyntaxOnly`).

## Comments

- Only comment when a name can't explain it: the _why_, an external constraint or a provider
  quirk. `getCsrfToken` says why the cookie can't be read (it belongs to the backend host);
  `RecipeDetail` says why raw HTML is safe (Wagtail whitelists the markup). Never restate the code.
- Rename or extract a function instead of commenting what a block does.

## Types

- No `any`, also not in tests (lint-enforced). Use `unknown` and narrow it: `ApiError.body` is
  `unknown`, and `isNoAccessError` narrows it before reading `code`.
- Use `import type` / inline `type` for type-only imports (lint-enforced).
- Validate untrusted data at the boundary (`src/api/`, `src/config.ts`), not in components.
- Let TypeScript infer local types. Annotate exported function signatures.

## Testing

- New features and behaviour changes get unit tests (Vitest, Testing Library) in `tests/unit`,
  mirroring the `src/` path, with shared setup in `tests/unit/support/`. Split large test files by
  scenario, as `LoginPrompt.test.tsx` does with one `describe` per scenario.
- Every new user-facing feature also gets an e2e test (Playwright) in `tests/e2e`, running against
  the mock CMS in `tests/e2e/mock-cms.ts`.

## Before finishing

Run `npm run format`, then `npm run lint`, `npm run build`, `npm test` and
`npm run test:e2e`. `format` writes
Prettier's layout, `lint` checks it. Re-read the diff and remove dead code, debug logs, unused
exports and anything the task didn't need.

## Workflow

- Implement code on feature branches, never directly on `main`.
- Fix existing findings in the same change that exposes them; keep format-only changes in their
  own commit.

## Committing changes

- Start commit messages with a capital-letter verb in imperative mode, without a prefix:
  `Move API errors into their own module`.
- Keep commit messages short.
- Only use a body for complex commits.
- Prefer small, granular commits over a single commit with a body explaining multiple changes.
