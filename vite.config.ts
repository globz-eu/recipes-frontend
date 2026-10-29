import { defineConfig } from 'vite'
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

const target = 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/frontend/',
  server: {
    proxy: Object.fromEntries(proxiedPaths.map((path) => [path, target])),
  },
})
