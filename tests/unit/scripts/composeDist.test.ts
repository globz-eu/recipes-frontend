// @vitest-environment node
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const overridePath = resolve(__dirname, "../../../compose.dist.yml")
const overrideText = readFileSync(overridePath, "utf8")

// No YAML parser is a dependency, so the override is checked by its text.
describe("compose.dist.yml", () => {
  it("binds ./dist read-only over the frontend directory of nginx", () => {
    expect(overrideText).toContain("source: ./dist")
    expect(overrideText).toContain("target: /usr/share/nginx/html/frontend")
    expect(overrideText).toContain("read_only: true")
  })

  it("removes the frontend release service and nginx's dependency on it", () => {
    expect(overrideText).toMatch(/^ {6}frontend: !reset null$/m)
    expect(overrideText).toMatch(/^ {2}frontend: !reset null$/m)
  })
})
