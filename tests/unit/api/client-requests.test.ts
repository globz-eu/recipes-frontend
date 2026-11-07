import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  apiFetch,
  apiPatch,
  apiPost,
  apiPut,
  getCsrfToken,
  resetCsrfToken,
} from "../../../src/api/client"
import { fetchHome } from "../../../src/api/home"
import { fetchRecipes } from "../../../src/api/recipes"
import { jsonResponse } from "../support/fixtures"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

beforeEach(() => resetCsrfToken())

afterEach(() => vi.unstubAllGlobals())

describe("request shape", () => {
  it("sends PUT and PATCH as JSON with a CSRF token", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "t" }),
      jsonResponse({}),
      jsonResponse({}),
    )

    await apiPut("/x", { a: 1 })
    await apiPatch("/y", { b: 2 })

    const [, put] = fetchMock.mock.calls[1]
    expect(put).toMatchObject({ method: "PUT", credentials: "include", body: '{"a":1}' })
    expect(put.headers).toMatchObject({ "Content-Type": "application/json", "X-CSRFToken": "t" })
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "PATCH", body: '{"b":2}' })
  })

  it("sends neither body nor content type for a POST without body", async () => {
    const fetchMock = stubFetch(jsonResponse({ csrfToken: "t" }), jsonResponse({}))

    await apiPost("/x")

    const [, init] = fetchMock.mock.calls[1]
    expect(init.body).toBeUndefined()
    expect(init.headers).not.toHaveProperty("Content-Type")
  })

  it("sends a GET without content type", async () => {
    const fetchMock = stubFetch(jsonResponse([]))

    await apiFetch("/x")

    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Accept: "application/json" })
  })
})

describe("CSRF token fetching", () => {
  it("shares one request between concurrent callers", async () => {
    const fetchMock = stubFetch(jsonResponse({ csrfToken: "t" }))

    const tokens = await Promise.all([getCsrfToken(), getCsrfToken()])

    expect(tokens).toEqual(["t", "t"])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rejects with the ApiError status when the token endpoint fails", async () => {
    stubFetch(new Response("down", { status: 503, statusText: "Unavailable" }))

    await expect(getCsrfToken()).rejects.toMatchObject({ name: "ApiError", status: 503 })
  })

  it("retries after a network failure of the token request", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "t" }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(getCsrfToken()).rejects.toThrow("offline")
    await expect(getCsrfToken()).resolves.toBe("t")
  })
})

describe("CSRF failure with a plain text body", () => {
  it("also refreshes and retries", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "stale" }),
      new Response("CSRF verification failed", { status: 403 }),
      jsonResponse({ csrfToken: "fresh" }),
      jsonResponse({ ok: true }),
    )

    await expect(apiPost("/x")).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls[3][1].headers["X-CSRFToken"]).toBe("fresh")
  })

  it("does not refresh for a CSRF mention under another status", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "t" }),
      jsonResponse({ detail: "CSRF Failed" }, 400),
    )

    await expect(apiPost("/x")).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe("endpoint URLs", () => {
  it("fetchHome requests the locale, encoded", async () => {
    const fetchMock = stubFetch(jsonResponse([]), jsonResponse([]))

    await fetchHome("de")
    await fetchHome("a&b")

    expect(fetchMock.mock.calls[0][0]).toBe("https://cms.example/api/home/?locale=de")
    expect(fetchMock.mock.calls[1][0]).toBe("https://cms.example/api/home/?locale=a%26b")
  })

  it("fetchRecipes requests all locales at once", async () => {
    const fetchMock = stubFetch(jsonResponse({ locales: {} }))

    await expect(fetchRecipes()).resolves.toEqual({ locales: {} })
    expect(fetchMock.mock.calls[0][0]).toBe("https://cms.example/api/recipes/")
  })
})
