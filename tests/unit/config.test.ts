import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function stubConfigResponse(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

// config.ts keeps the loaded config at module level, so each test gets a fresh module.
async function importConfig() {
  return import("../../src/config")
}

beforeEach(() => vi.resetModules())

afterEach(() => vi.unstubAllGlobals())

describe("getConfig", () => {
  it("throws before loadConfig has run", async () => {
    const { getConfig } = await importConfig()

    expect(() => getConfig()).toThrow("before loadConfig")
  })
})

describe("loadConfig", () => {
  it("fetches config.json next to index.html without caching", async () => {
    const fetchMock = stubConfigResponse(Response.json({ apiBaseUrl: "" }))
    const { loadConfig } = await importConfig()

    await loadConfig()

    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}config.json`, {
      cache: "no-store",
    })
  })

  it("makes the loaded config available through getConfig", async () => {
    stubConfigResponse(Response.json({ apiBaseUrl: "https://cms.example" }))
    const { getConfig, loadConfig } = await importConfig()

    await loadConfig()

    expect(getConfig()).toEqual({ apiBaseUrl: "https://cms.example" })
  })

  it("strips a trailing slash from apiBaseUrl", async () => {
    stubConfigResponse(Response.json({ apiBaseUrl: "https://cms.example/" }))
    const { loadConfig } = await importConfig()

    await expect(loadConfig()).resolves.toEqual({ apiBaseUrl: "https://cms.example" })
  })

  it("defaults a missing apiBaseUrl to the empty string", async () => {
    stubConfigResponse(Response.json({}))
    const { loadConfig } = await importConfig()

    await expect(loadConfig()).resolves.toEqual({ apiBaseUrl: "" })
  })

  it("rejects when config.json cannot be loaded", async () => {
    stubConfigResponse(new Response("missing", { status: 404 }))
    const { loadConfig } = await importConfig()

    await expect(loadConfig()).rejects.toThrow("HTTP 404")
  })
})
