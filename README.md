# recipes-frontend

React + TypeScript + Vite frontend for [recipes-cms](https://github.com/globz-eu/recipes-cms),
served under `/frontend/`.

## Development

```bash
npm ci
npm run dev    # proxies the API to recipes-cms on http://localhost:8080
npm run lint
npm run build  # outputs dist/
```

The local recipes-cms compose setup serves `../recipes-frontend/dist` at `/frontend/`.

### Dev server target and port

`npm run dev` proxies `/api`, `/api-auth`, `/login`, `/complete`, `/disconnect`, `/admin` and
`/media` to a recipes-cms backend. These variables choose the backend and the dev server port;
set them in the shell or in `.env.local` (gitignored). They only configure the dev server and
never reach the bundle.

| Variable | Default | Description |
|----------|---------|-------------|
| `RECIPES_CMS_PORT` | `8080` | `NGINX_HOST_PORT` of a local recipes-cms stack; the proxy targets `http://localhost:<port>`. |
| `RECIPES_CMS_URL` | unset | Origin of any other backend, e.g. a remote one (`https://cms.example.com`, no path). Takes precedence over `RECIPES_CMS_PORT`, which is then ignored with a warning. |
| `DEV_SERVER_PORT` | `5173 + (RECIPES_CMS_PORT - 8080)`, or `5173` with `RECIPES_CMS_URL` | Port of the dev server. |

```bash
# .env.local: work against the worktree stack started with `invoke worktree-env --port 8081`
RECIPES_CMS_PORT=8081   # dev server on http://localhost:5174/frontend/
```

Each stack pairs with one dev server (8080 with 5173, 8081 with 5174, ... 8089 with 5182), so
dev servers for several stacks run side by side. The dev server never moves to another port: if
its port is taken, `npm run dev` stops with "Port ... is already in use". Invalid values stop it
at startup with a message naming the variable, and it logs its proxy target on start.

The browser's origin is the dev server, so the backend must trust it for CSRF, or CSRF-checked
requests (session-authenticated POSTs such as logout) fail with 403; only `/api/dev-login/` is
exempt:

- A recipes-cms dev stack trusts `http://localhost:5173` and its paired port (recipes-cms
  [#20](https://github.com/globz-eu/recipes-cms/issues/20)). With an older stack, only 5173 works:
  set `DEV_SERVER_PORT=5173`.
- With `RECIPES_CMS_URL`, the backend's `CSRF_TRUSTED_ORIGINS` (and its CORS/cookie settings) must
  allow `http://localhost:<DEV_SERVER_PORT>`; the proxy sends the backend's own host name.

Social login through the dev server needs the stack's origin registered with the provider
(recipes-infrastructure [#7](https://github.com/globz-eu/recipes-infrastructure/issues/7)).

## Configuration

The build is environment-independent. At startup the app fetches `config.json` from next to
its `index.html`:

```json
{
  "apiBaseUrl": "https://staging.example.com"
}
```

| Key | Description |
|-----|-------------|
| `apiBaseUrl` | Base URL of the recipes-cms backend, without trailing slash. Empty when served from the same origin. |

[public/config.json](public/config.json) holds the same-origin defaults; deployments overwrite it.

## Releases

Pushing a `vX.Y.Z` tag builds the app and attaches `recipes-frontend-vX.Y.Z.tar.gz` (the contents
of `dist/`) to a GitHub release:

```bash
npm version patch   # bumps package.json and tags vX.Y.Z
git push --follow-tags
```

## License

[MIT](LICENSE)
