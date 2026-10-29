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

// Reads a TCP port from env, or returns the fallback when the variable is unset or empty.
function readPort(env: Record<string, string>, name: string, fallback: number) {
  const raw = env[name]?.trim()
  if (!raw) return fallback
  const port = Number(raw)
  if (!/^\d+$/.test(raw) || port < 1024 || port > 65535) {
    throw new Error(`${name} must be an integer between 1024 and 65535, got "${raw}"`)
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
  const cmsPort = readPort(env, 'RECIPES_CMS_PORT', defaultCmsPort)
  const target = `http://localhost:${cmsPort}`

  return {
    plugins: [react(), logProxyTarget(target)],
    base: '/frontend/',
    server: {
      proxy: Object.fromEntries(proxiedPaths.map((path) => [path, target])),
    },
  }
})
