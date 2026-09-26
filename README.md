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
