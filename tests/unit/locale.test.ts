import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getInitialLocale, storeLocale } from "../../src/locale"

function stubBrowserLanguage(language: string) {
  vi.spyOn(navigator, "language", "get").mockReturnValue(language)
}

beforeEach(() => localStorage.clear())

afterEach(() => vi.unstubAllGlobals())

describe("getInitialLocale", () => {
  it("prefers the stored choice over the browser language", () => {
    localStorage.setItem("locale", "fr")
    stubBrowserLanguage("de-DE")

    expect(getInitialLocale()).toBe("fr")
  })

  it("uses the browser language when nothing is stored", () => {
    stubBrowserLanguage("nl-BE")

    expect(getInitialLocale()).toBe("nl")
  })

  it("ignores a stored value that is not a supported locale", () => {
    localStorage.setItem("locale", "xx")
    stubBrowserLanguage("de")

    expect(getInitialLocale()).toBe("de")
  })

  it("falls back to English for an unsupported browser language", () => {
    stubBrowserLanguage("ja-JP")

    expect(getInitialLocale()).toBe("en")
  })

  it("falls back to the browser language when localStorage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied")
      },
    })
    stubBrowserLanguage("de")

    expect(getInitialLocale()).toBe("de")
  })
})

describe("storeLocale", () => {
  it("persists the choice for the next visit", () => {
    storeLocale("nl")

    expect(localStorage.getItem("locale")).toBe("nl")
  })

  it("does not throw when localStorage throws", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("denied")
      },
    })

    expect(() => storeLocale("de")).not.toThrow()
  })
})
