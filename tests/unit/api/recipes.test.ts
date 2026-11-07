import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetCsrfToken } from "../../../src/api/client"
import { fetchRecipes } from "../../../src/api/recipes"
import { jsonResponse, stubFetch } from "../support/fixtures"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

beforeEach(() => resetCsrfToken())

afterEach(() => vi.unstubAllGlobals())

describe("fetchRecipes", () => {
  it("requests all locales at once", async () => {
    const fetchMock = stubFetch(jsonResponse({ locales: {} }))

    await expect(fetchRecipes()).resolves.toEqual({ locales: {} })
    expect(fetchMock.mock.calls[0][0]).toBe("https://cms.example/api/recipes/")
  })
})
