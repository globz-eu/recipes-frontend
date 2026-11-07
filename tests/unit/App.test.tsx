import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { App } from "../../src/App"
import { jsonResponse, makeHomePage } from "./support/fixtures"

vi.mock("../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

const providers = [{ id: "local", label: "Username and password", login_url: "/admin/login/" }]

interface CmsStub {
  homeStatus: number
  homeBody: (locale: string) => unknown
}

function stubCms(overrides: Partial<CmsStub> = {}) {
  const cms: CmsStub = {
    homeStatus: 200,
    homeBody: (locale) => [makeHomePage({ title: `Home ${locale}` })],
    ...overrides,
  }
  const fetchMock = vi.fn(async (url: string) => {
    const { pathname, searchParams } = new URL(url)
    if (pathname === "/api/home/") {
      return jsonResponse(cms.homeBody(searchParams.get("locale") ?? ""), cms.homeStatus)
    }
    if (pathname === "/api/recipes/") return jsonResponse({ locales: {} })
    if (pathname === "/api/auth/providers/") return jsonResponse({ providers })
    return jsonResponse({}, 404)
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function homeRequests(fetchMock: ReturnType<typeof stubCms>) {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.includes("/api/home/"))
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(navigator, "language", "get").mockReturnValue("en-US")
  window.history.pushState(null, "", "/")
})

afterEach(() => vi.unstubAllGlobals())

describe("App states", () => {
  it("shows a loading state, then the home page", async () => {
    stubCms()
    renderApp()

    expect(screen.getByText("Loading...")).toBeInTheDocument()
    expect(await screen.findByRole("heading", { name: "Home en" })).toBeInTheDocument()
  })

  it("shows the login prompt without retrying when the user is not logged in", async () => {
    const fetchMock = stubCms({
      homeStatus: 403,
      homeBody: () => ({ detail: "Authentication credentials were not provided." }),
    })
    renderApp()

    expect(await screen.findByRole("link", { name: "Username and password" })).toBeInTheDocument()
    expect(homeRequests(fetchMock)).toHaveLength(1)
  })

  it("shows the no-access prompt for a user without a role", async () => {
    stubCms({ homeStatus: 403, homeBody: () => ({ detail: "No role", code: "no_access" }) })
    renderApp()

    expect(await screen.findByRole("link", { name: "Log out" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Username and password" })).not.toBeInTheDocument()
  })

  it("retries a server error twice, then shows it", async () => {
    const fetchMock = stubCms({ homeStatus: 500, homeBody: () => ({ detail: "boom" }) })
    renderApp()

    expect(await screen.findByText(/Error loading content/)).toBeInTheDocument()
    expect(homeRequests(fetchMock)).toHaveLength(3)
  })
})

describe("App language", () => {
  it("starts in the stored language", async () => {
    localStorage.setItem("locale", "fr")
    const fetchMock = stubCms()
    renderApp()

    expect(await screen.findByRole("heading", { name: "Home fr" })).toBeInTheDocument()
    expect(homeRequests(fetchMock)).toEqual(["https://cms.example/api/home/?locale=fr"])
  })

  it("loads, stores and shows the chosen language, dropping an open recipe", async () => {
    stubCms()
    window.history.pushState(null, "", "/#recipe-en-pancakes")
    renderApp()
    await screen.findByRole("heading", { name: "Home en" })

    fireEvent.click(screen.getByRole("button", { name: "DE" }))

    expect(await screen.findByRole("heading", { name: "Home de" })).toBeInTheDocument()
    expect(localStorage.getItem("locale")).toBe("de")
    await waitFor(() => expect(window.location.hash).toBe(""))
  })

  it("keeps the page visible while the other language loads", async () => {
    stubCms()
    renderApp()
    await screen.findByRole("heading", { name: "Home en" })

    fireEvent.click(screen.getByRole("button", { name: "NL" }))

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Home en" })).toBeInTheDocument()
    await screen.findByRole("heading", { name: "Home nl" })
  })
})
