import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetCsrfToken } from "../../../src/api/client"
import { homeQueryKey } from "../../../src/api/home"
import { DevLoginForm } from "../../../src/components/DevLoginForm"
import { jsonResponse } from "../support/fixtures"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

function stubLogin(status: number) {
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith("/api/csrf/") ? jsonResponse({ csrfToken: "t" }) : jsonResponse({}, status),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function renderForm() {
  const client = new QueryClient()
  client.setQueryData(homeQueryKey("en"), [])
  render(
    <QueryClientProvider client={client}>
      <DevLoginForm />
    </QueryClientProvider>,
  )
  return client
}

function submitCredentials() {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "editor" } })
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } })
  fireEvent.click(screen.getByRole("button", { name: "Log in" }))
}

beforeEach(() => resetCsrfToken())

afterEach(() => vi.unstubAllGlobals())

describe("DevLoginForm", () => {
  it("posts the entered credentials and invalidates the home queries", async () => {
    const fetchMock = stubLogin(200)
    const client = renderForm()

    submitCredentials()

    await waitFor(() => expect(client.getQueryState(homeQueryKey("en"))?.isInvalidated).toBe(true))
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(url).toBe("https://cms.example/api/dev-login/")
    expect(init.body).toBe(JSON.stringify({ username: "editor", password: "secret" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("asks for a new CSRF token after logging in", async () => {
    const fetchMock = stubLogin(200)
    renderForm()
    submitCredentials()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    submitCredentials()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[2][0]).toBe("https://cms.example/api/csrf/")
  })

  it.each([
    [400, "Invalid username or password."],
    [404, "Dev login is disabled on this backend."],
    [500, "Login failed."],
  ])("shows a message for a %i response", async (status, message) => {
    stubLogin(status)
    const client = renderForm()

    submitCredentials()

    expect(await screen.findByRole("alert")).toHaveTextContent(message)
    expect(client.getQueryState(homeQueryKey("en"))?.isInvalidated).toBe(false)
  })

  it("clears the previous error on the next attempt", async () => {
    stubLogin(400)
    renderForm()
    submitCredentials()
    await screen.findByRole("alert")

    stubLogin(200)
    submitCredentials()

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
  })
})
