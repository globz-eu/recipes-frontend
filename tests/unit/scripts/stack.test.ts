// @vitest-environment node
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

const repoRoot = resolve(__dirname, "../../..")
const stackScript = join(repoRoot, "scripts/stack.sh")

let workDir: string

// The fake dev-stack.sh records its arguments and the directory it was called from.
function createFakeInfra(parent: string): string {
  const infra = join(parent, "infra")
  mkdirSync(join(infra, "scripts"), { recursive: true })
  writeFileSync(
    join(infra, "scripts/dev-stack.sh"),
    'pwd > "$RECORD_FILE"\nfor argument in "$@"; do echo "$argument" >> "$RECORD_FILE"; done\n',
  )
  return infra
}

function runStack(args: string[], environment: Record<string, string> = {}) {
  return spawnSync("sh", [stackScript, ...args], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      RECORD_FILE: join(workDir, "record"),
      ...environment,
    },
  })
}

function recordedLines(): string[] {
  return readFileSync(join(workDir, "record"), "utf8").trim().split("\n")
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "stack-test-"))
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe("stack.sh mode mapping", () => {
  it("passes up through unchanged", () => {
    const infra = createFakeInfra(workDir)

    const result = runStack(["up", "--watch"], { RECIPES_INFRA_DIR: infra })

    expect(result.status).toBe(0)
    expect(recordedLines().slice(1)).toEqual(["up", "--watch"])
  })

  it("runs dist as up with the override and no frontend lookup", () => {
    const infra = createFakeInfra(workDir)

    const result = runStack(["dist", "--build"], { RECIPES_INFRA_DIR: infra })

    expect(result.status).toBe(0)
    expect(recordedLines().slice(1)).toEqual([
      "up",
      "--skip-lookup",
      "FRONTEND_VERSION",
      "-f",
      join(repoRoot, "compose.dist.yml"),
      "--build",
    ])
  })

  it.each(["down", "env", "compose"])("passes %s with its arguments", (mode) => {
    const infra = createFakeInfra(workDir)

    runStack([mode, "-v", "--port", "8094"], { RECIPES_INFRA_DIR: infra })

    expect(recordedLines().slice(1)).toEqual([mode, "-v", "--port", "8094"])
  })

  it("calls dev-stack.sh from the repository root", () => {
    const infra = createFakeInfra(workDir)

    runStack(["down"], { RECIPES_INFRA_DIR: infra })

    expect(recordedLines()[0]).toBe(repoRoot)
  })

  it("rejects an unknown mode and a missing mode", () => {
    const infra = createFakeInfra(workDir)

    const unknown = runStack(["bogus"], { RECIPES_INFRA_DIR: infra })
    const missing = runStack([], { RECIPES_INFRA_DIR: infra })

    expect(unknown.status).toBe(1)
    expect(unknown.stderr).toContain("unknown mode 'bogus'")
    expect(missing.status).toBe(1)
    expect(missing.stderr).toContain("usage")
  })
})

describe("stack.sh dist directory", () => {
  it("creates dist before handing over to dev-stack.sh", () => {
    const infra = createFakeInfra(workDir)
    const hasDist = existsSync(join(repoRoot, "dist"))

    runStack(["dist"], { RECIPES_INFRA_DIR: infra })

    expect(existsSync(join(repoRoot, "dist"))).toBe(true)
    if (!hasDist) rmSync(join(repoRoot, "dist"), { recursive: true })
  })
})

describe("stack.sh infrastructure location", () => {
  it("fails with a pointer to the README when the checkout is missing", () => {
    const result = runStack(["up"], {
      RECIPES_INFRA_DIR: join(workDir, "missing"),
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("scripts/dev-stack.sh not found")
    expect(result.stderr).toContain("Local dev environment")
  })
})
