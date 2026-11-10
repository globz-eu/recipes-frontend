import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getCsrfToken, resetCsrfToken } from "../../../src/api/client"
import { AUTH_ERROR_MESSAGES } from "../../../src/auth/urls"
import { ProviderLoginForm } from "../../../src/components/ProviderLoginForm"
import { jsonResponse, stubFetch } from "../support/fixtures"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

const provider = { id: "zitadel", label: "Zitadel", login_url: "/login/zitadel/" }

function spyOnSubmit() {
  return vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => undefined)
}

function renderForm() {
  render(<ProviderLoginForm provider={provider} />)
  const button = screen.getByRole("button", { name: "Zitadel" })
  const form = button.closest("form") as HTMLFormElement
  return { button, form }
}

beforeEach(() => {
  resetCsrfToken()
  window.history.pushState(null, "", "/frontend/?auth_error=email_in_use&x=1#recipe-en-foo")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ProviderLoginForm", () => {
  it("posts to the provider login URL with next and without auth_error", () => {
    const { form } = renderForm()
    expect(form).toHaveAttribute("action", "https://cms.example/login/zitadel/")
    expect(form).toHaveAttribute("method", "post")
    const fields = new FormData(form)
    expect(fields.get("next")).toBe(`${window.location.origin}/frontend/?x=1#recipe-en-foo`)
  })

  it("fetches a fresh token on each click, even with a cached one, then submits", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ csrfToken: "cached" }),
      jsonResponse({ csrfToken: "token-1" }),
      jsonResponse({ csrfToken: "token-2" }),
    )
    await getCsrfToken()
    const submit = spyOnSubmit()
    const { button, form } = renderForm()

    fireEvent.click(button)
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(new FormData(form).get("csrfmiddlewaretoken")).toBe("token-1")

    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(new FormData(form).get("csrfmiddlewaretoken")).toBe("token-2")
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      Array(3).fill("https://cms.example/api/csrf/"),
    )
  })

  it("disables the button while the token is being fetched", async () => {
    let resolveToken: (response: Response) => void = () => undefined
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => (resolveToken = resolve))),
    )
    const submit = spyOnSubmit()
    const { button } = renderForm()

    fireEvent.click(button)

    await waitFor(() => expect(button).toBeDisabled())
    resolveToken(jsonResponse({ csrfToken: "t" }))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  })

  it("shows login_failed and does not submit when the token request fails", async () => {
    stubFetch(jsonResponse({ detail: "boom" }, 500))
    const submit = spyOnSubmit()
    const { button } = renderForm()

    fireEvent.click(button)

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_ERROR_MESSAGES.login_failed)
    expect(submit).not.toHaveBeenCalled()
    expect(button).toBeEnabled()
  })
})
