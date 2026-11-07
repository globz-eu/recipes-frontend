import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiDelete, apiFetch, apiPost, apiUrl, resetCsrfToken } from "../../../src/api/client"
import { ApiError, isNoAccessError } from "../../../src/api/errors"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

beforeEach(() => resetCsrfToken())

afterEach(() => vi.unstubAllGlobals())

describe("apiUrl", () => {
  it("prefixes the path with apiBaseUrl", () => {
    expect(apiUrl("/api/home/")).toBe("https://cms.example/api/home/")
  })
})

describe("apiFetch", () => {
  it("sends credentials and no CSRF header", async () => {
    const fetchMock = stubFetch(jsonResponse([]))

    await apiFetch("/api/home/")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://cms.example/api/home/")
    expect(init.credentials).toBe("include")
    expect(init.headers["X-CSRFToken"]).toBeUndefined()
  })
})

describe("CSRF token", () => {
  it("is sent on unsafe methods", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "token-1" }),
      jsonResponse({}),
      jsonResponse({}),
    )

    await apiPost("/x", { a: 1 })
    await apiDelete("/x")

    expect(fetchMock.mock.calls[1][1].headers["X-CSRFToken"]).toBe("token-1")
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE")
    expect(fetchMock.mock.calls[2][1].headers["X-CSRFToken"]).toBe("token-1")
  })

  it("is fetched once and cached", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "token-1" }),
      jsonResponse({}),
      jsonResponse({}),
    )

    await apiPost("/x")
    await apiPost("/x")

    const csrfCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "https://cms.example/api/csrf/",
    )
    expect(csrfCalls).toHaveLength(1)
  })

  it("is fetched again after the first fetch failed", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ detail: "down" }, 500),
      jsonResponse({ csrfToken: "token-2" }),
      jsonResponse({}),
    )

    await expect(apiPost("/x")).rejects.toMatchObject({ status: 500 })
    await apiPost("/x")

    expect(fetchMock.mock.calls[1][0]).toBe("https://cms.example/api/csrf/")
    expect(fetchMock.mock.calls[2][1].headers["X-CSRFToken"]).toBe("token-2")
  })
})

describe("CSRF failure", () => {
  it("refreshes the token and retries once", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "stale" }),
      jsonResponse({ detail: "CSRF Failed: token missing" }, 403),
      jsonResponse({ csrfToken: "fresh" }),
      jsonResponse({ ok: true }),
    )

    await expect(apiPost("/x")).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[3][1].headers["X-CSRFToken"]).toBe("fresh")
  })

  it("does not retry a second time", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "stale" }),
      jsonResponse({ detail: "CSRF Failed" }, 403),
      jsonResponse({ csrfToken: "fresh" }),
      jsonResponse({ detail: "CSRF Failed" }, 403),
    )

    await expect(apiPost("/x")).rejects.toMatchObject({ status: 403 })

    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("does not retry a 403 that does not mention CSRF", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "token-1" }),
      jsonResponse({ detail: "Forbidden" }, 403),
    )

    await expect(apiPost("/x")).rejects.toMatchObject({ status: 403 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("does not retry safe methods", async () => {
    const fetchMock = stubFetch(jsonResponse({ detail: "CSRF Failed" }, 403))

    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 403 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("errors", () => {
  it("throws an ApiError with status and JSON body", async () => {
    stubFetch(jsonResponse({ detail: "Not found." }, 404))

    const error: unknown = await apiFetch("/x").catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, body: { detail: "Not found." } })
  })

  it("keeps a plain text body as a string", async () => {
    stubFetch(
      new Response("Bad gateway", { status: 502, headers: { "Content-Type": "text/plain" } }),
    )

    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 502, body: "Bad gateway" })
  })

  it("uses a null body for an empty error response", async () => {
    stubFetch(new Response(null, { status: 500 }))

    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 500, body: null })
  })

  it("lets isNoAccessError recognise the no_access code", async () => {
    stubFetch(jsonResponse({ detail: "No role", code: "no_access" }, 403))

    const error: unknown = await apiFetch("/x").catch((caught: unknown) => caught)

    expect(isNoAccessError(error)).toBe(true)
  })

  it("does not take an anonymous 403 for no access", async () => {
    stubFetch(jsonResponse({ detail: "Authentication credentials were not provided." }, 403))

    const error: unknown = await apiFetch("/x").catch((caught: unknown) => caught)

    expect(isNoAccessError(error)).toBe(false)
  })
})
