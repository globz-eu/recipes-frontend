import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

// Separate from vite.config.ts: that one validates dev-server env variables and builds
// the proxy, which tests must not depend on.
export default defineConfig({
  plugins: [react()],
  base: "/frontend/",
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
    restoreMocks: true,
  },
})
