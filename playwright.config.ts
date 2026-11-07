import { defineConfig, devices } from "@playwright/test"

// Parallel worktrees set distinct ports; strictPort makes a clash fail loudly.
const port = Number(process.env.E2E_PORT ?? 4173)
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(
    `E2E_PORT must be an integer between 1024 and 65535, got "${process.env.E2E_PORT}"`,
  )
}

export default defineConfig({
  testDir: "tests/e2e",
  reporter: [["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${port}/frontend/` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}/frontend/`,
    reuseExistingServer: false,
  },
})
