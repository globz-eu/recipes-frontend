import { homePages } from "./fixtures"
import { CmsSession, expect, test } from "./mock-cms"

const LOGIN_MESSAGE = "You must be logged in to view this content."

for (const anonymousStatus of [401, 403] as const) {
  test.describe(`anonymous (${anonymousStatus})`, () => {
    test.use({ cmsOptions: { session: CmsSession.Anonymous, anonymousStatus } })

    test("shows the login prompt with a link for local login and a button per provider", async ({
      page,
      baseURL,
    }) => {
      await page.goto("")
      await expect(page.getByText(LOGIN_MESSAGE)).toBeVisible()
      const next = encodeURIComponent(baseURL ?? "")
      await expect(page.getByRole("link", { name: "Username and password" })).toHaveAttribute(
        "href",
        `/admin/login/?next=${next}`,
      )
      const form = page.locator("form.provider-login-form")
      await expect(form).toHaveAttribute("method", "post")
      await expect(form).toHaveAttribute("action", "/login/auth0/")
      await expect(form.locator("input[name=next]")).toHaveValue(baseURL ?? "")
      await expect(page.getByRole("button", { name: "Auth0" })).toBeVisible()
    })
  })
}

test.describe("login", () => {
  test.use({ cmsOptions: { session: CmsSession.Anonymous, anonymousStatus: 403 } })

  test("signs in through a provider with a POST and returns to the app", async ({
    page,
    cms,
    baseURL,
  }) => {
    await page.goto("")
    await page.getByRole("button", { name: "Auth0" }).click()
    await expect(page.getByRole("heading", { name: homePages.en.title })).toBeVisible()
    expect(cms.loginPosts).toHaveLength(1)
    expect(cms.loginPosts[0].get("csrfmiddlewaretoken")).toBe("test-csrf-token")
    expect(cms.loginPosts[0].get("next")).toBe(baseURL)
  })

  test("shows login_failed inline and stays on the page when the token request fails", async ({
    page,
    cms,
    baseURL,
  }) => {
    await page.route("**/api/csrf/", (route) => route.fulfill({ status: 500, json: {} }))
    await page.goto("")
    await page.getByRole("button", { name: "Auth0" }).click()
    await expect(page.getByRole("alert")).toHaveText("Sign-in failed. Please try again.")
    await expect(page).toHaveURL(baseURL ?? "")
    expect(cms.loginPosts).toHaveLength(0)
  })

  test("shows a refused login and drops auth_error from the URL", async ({ page, baseURL }) => {
    await page.goto("?auth_error=email_in_use")
    await expect(page.getByRole("alert")).toHaveText(
      "This email address is already used with a different login method. Use that method to sign in.",
    )
    await expect(page).toHaveURL(baseURL ?? "")
    await expect(page.locator("form.provider-login-form input[name=next]")).toHaveValue(
      baseURL ?? "",
    )
  })
})

test.describe("no access", () => {
  test.use({ cmsOptions: { session: CmsSession.NoAccess, anonymousStatus: 403 } })

  test("asks for a role and offers a logout", async ({ page }) => {
    await page.goto("")
    await expect(page.getByText("Your account has no access to this content.")).toBeVisible()
    await page.getByRole("link", { name: "Log out" }).click()
    await expect(page.getByText(LOGIN_MESSAGE)).toBeVisible()
  })
})

test("logs out to the frontend root", async ({ page, baseURL }) => {
  await page.goto("#recipe-en-pancakes")
  await expect(page.getByRole("heading", { name: "Pancakes" })).toBeVisible()
  await page.getByRole("link", { name: "Log out" }).click()
  await expect(page.getByText(LOGIN_MESSAGE)).toBeVisible()
  await expect(page).toHaveURL(baseURL ?? "")
})
