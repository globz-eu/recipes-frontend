import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchAuthProviders } from "./auth"

vi.mock("../config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

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
