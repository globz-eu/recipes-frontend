import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetCsrfToken } from "../../../src/api/client"
import { fetchHome } from "../../../src/api/home"
import { jsonResponse, stubFetch } from "../support/fixtures"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

beforeEach(() => resetCsrfToken())

afterEach(() => vi.unstubAllGlobals())

describe("fetchHome", () => {
  it("requests the locale, encoded", async () => {
    const fetchMock = stubFetch(jsonResponse([]), jsonResponse([]))

    await fetchHome("de")
    await fetchHome("a&b")

    expect(fetchMock.mock.calls[0][0]).toBe("https://cms.example/api/home/?locale=de")
    expect(fetchMock.mock.calls[1][0]).toBe("https://cms.example/api/home/?locale=a%26b")
  })
})
