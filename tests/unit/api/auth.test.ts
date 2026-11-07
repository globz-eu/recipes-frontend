import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { devLogin, fetchAuthProviders, forgetSession } from "../../../src/api/auth"
import { resetCsrfToken } from "../../../src/api/client"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => resetCsrfToken())

afterEach(() => vi.unstubAllGlobals())

describe("fetchAuthProviders", () => {
  it("returns the providers list in response order", async () => {
    const providers = [
      { id: "zitadel", label: "Zitadel", login_url: "/login/zitadel/" },
      { id: "local", label: "Username and password", login_url: "/admin/login/" },
    ]
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers }), {
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchAuthProviders()).resolves.toEqual(providers)
    expect(fetchMock.mock.calls[0][0]).toBe("https://cms.example/api/auth/providers/")
  })
})

describe("devLogin", () => {
  it("posts the credentials with a CSRF token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "token-1" }))
      .mockResolvedValueOnce(jsonResponse({}))
    vi.stubGlobal("fetch", fetchMock)

    await devLogin({ username: "admin", password: "secret" })

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe("https://cms.example/api/dev-login/")
    expect(init.method).toBe("POST")
    expect(init.headers["X-CSRFToken"]).toBe("token-1")
    expect(init.body).toBe(JSON.stringify({ username: "admin", password: "secret" }))
  })

  it("drops the cached CSRF token so the next write fetches a new one", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "token-1" }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "token-2" }))
      .mockResolvedValueOnce(jsonResponse({}))
    vi.stubGlobal("fetch", fetchMock)

    await devLogin({ username: "a", password: "b" })
    await devLogin({ username: "a", password: "b" })

    expect(fetchMock.mock.calls[2][0]).toBe("https://cms.example/api/csrf/")
    expect(fetchMock.mock.calls[3][1].headers["X-CSRFToken"]).toBe("token-2")
  })

  it("rejects with the ApiError when the login fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "token-1" }))
      .mockResolvedValueOnce(jsonResponse({ detail: "bad" }, 400))
    vi.stubGlobal("fetch", fetchMock)

    await expect(devLogin({ username: "a", password: "b" })).rejects.toMatchObject({
      status: 400,
    })
  })
})

describe("forgetSession", () => {
  it("makes the next write fetch a fresh CSRF token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "token-1" }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "token-2" }))
      .mockResolvedValueOnce(jsonResponse({}))
    vi.stubGlobal("fetch", fetchMock)
    await devLogin({ username: "a", password: "b" })

    forgetSession()
    await devLogin({ username: "a", password: "b" })

    expect(fetchMock.mock.calls[2][0]).toBe("https://cms.example/api/csrf/")
  })
})
