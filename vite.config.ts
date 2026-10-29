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

// Prints the proxy target when the dev server starts (not for vite build).
function logProxyTarget(target: string): Plugin {
  return {
    name: 'log-proxy-target',
    configureServer(server) {
      server.config.logger.info(`  recipes-cms proxy target: ${target}`)
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
  const cmsPort = readPort(env, 'RECIPES_CMS_PORT') ?? defaultCmsPort
  const target = `http://localhost:${cmsPort}`
  // Stack 8080 pairs with dev server 5173, 8081 with 5174, ... (recipes-cms trusts the
  // paired origin for CSRF). The port is pinned: a silent move would fail every POST.
  const devServerPort =
    readPort(env, 'DEV_SERVER_PORT') ?? pairedDevServerPort(cmsPort)

  return {
    plugins: [react(), logProxyTarget(target)],
    base: '/frontend/',
    server: {
      port: devServerPort,
      strictPort: true,
      proxy: Object.fromEntries(proxiedPaths.map((path) => [path, target])),
    },
  }
})
