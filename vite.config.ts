import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Paths the dev server forwards to recipes-cms.
const proxiedPaths = [
  '/api',
  '/api-auth',
  '/login',
  '/complete',
  '/disconnect',
  '/admin',
  '/media',
]

const defaultCmsPort = 8080
const defaultDevServerPort = 5173

// Reads a TCP port from env; undefined when the variable is unset or empty.
function readPort(env: Record<string, string>, name: string) {
  const raw = env[name]?.trim()
  if (!raw) return undefined
  const port = Number(raw)
  if (!/^\d+$/.test(raw) || port < 1024 || port > 65535) {
    throw new Error(`${name} must be an integer between 1024 and 65535, got "${raw}"`)
  }
  return port
}

// Dev server port paired with a recipes-cms stack port: 5173 + (cmsPort - 8080).
function pairedDevServerPort(cmsPort: number) {
  const port = defaultDevServerPort + cmsPort - defaultCmsPort
  if (port < 1024 || port > 65535) {
    throw new Error(
      `RECIPES_CMS_PORT=${cmsPort} gives no usable dev server port (${port}); set DEV_SERVER_PORT`,
    )
  }
  return port
}

// Reads a backend origin (http[s]://host[:port], nothing after it) from env; undefined
// when the variable is unset or empty.
function readOrigin(env: Record<string, string>, name: string) {
  const raw = env[name]?.trim()
  if (!raw) return undefined
  const fail = () =>
    new Error(`${name} must be an http(s) origin like https://cms.example.com, got "${raw}"`)
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw fail()
  }
  const bare = url.pathname === '/' && !url.search && !url.hash
  if (!['http:', 'https:'].includes(url.protocol) || !bare || url.username || url.password) {
    throw fail()
  }
  return url.origin
}

// Prints the proxy target when the dev server starts (not for vite build).
function logProxyTarget(target: string, warning?: string): Plugin {
  return {
    name: 'log-proxy-target',
    configureServer(server) {
      server.config.logger.info(`  recipes-cms proxy target: ${target}`)
      if (warning) server.config.logger.warn(`  ${warning}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command !== 'serve') {
    return { plugins: [react()], base: '/frontend/' }
  }

  // The proxy settings are config-only, so they carry no VITE_ prefix and never reach
  // the client bundle. Reads .env, .env.local, .env.[mode][.local] and the shell environment.
  const env = loadEnv(mode, process.cwd(), '')
  const cmsPort = readPort(env, 'RECIPES_CMS_PORT')
  // RECIPES_CMS_URL (any backend, e.g. a remote one) takes precedence over RECIPES_CMS_PORT
  // (a local stack on http://localhost:<port>).
  const cmsUrl = readOrigin(env, 'RECIPES_CMS_URL')
  const target = cmsUrl ?? `http://localhost:${cmsPort ?? defaultCmsPort}`
  const warning =
    cmsUrl && cmsPort !== undefined
      ? 'RECIPES_CMS_PORT is ignored because RECIPES_CMS_URL is set'
      : undefined
  // Stack 8080 pairs with dev server 5173, 8081 with 5174, ... (recipes-cms trusts the
  // paired origin for CSRF). With RECIPES_CMS_URL there is no stack port to pair with, so
  // the default is 5173. The port is pinned: a silent move would fail every POST.
  const devServerPort =
    readPort(env, 'DEV_SERVER_PORT') ??
    (cmsUrl ? defaultDevServerPort : pairedDevServerPort(cmsPort ?? defaultCmsPort))
  // A local stack's nginx ignores the incoming port (it sends X-Forwarded-Host with its own),
  // so its proxy keeps the dev server's Host; another backend needs its own Host to match its
  // virtual host, ALLOWED_HOSTS and TLS certificate.
  const proxyOptions = { target, changeOrigin: Boolean(cmsUrl) }

  return {
    plugins: [react(), logProxyTarget(target, warning)],
    base: '/frontend/',
    server: {
      port: devServerPort,
      strictPort: true,
      proxy: Object.fromEntries(proxiedPaths.map((path) => [path, proxyOptions])),
    },
  }
})
