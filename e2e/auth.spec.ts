import { homePages } from "./fixtures"
import { CmsSession, expect, test } from "./mock-cms"

const LOGIN_MESSAGE = "You must be logged in to view this content."

for (const anonymousStatus of [401, 403] as const) {
  test.describe(`anonymous (${anonymousStatus})`, () => {
    test.use({ cmsOptions: { session: CmsSession.Anonymous, anonymousStatus } })

    test("shows the login prompt with one link per provider", async ({ page, baseURL }) => {
      await page.goto("")
      await expect(page.getByText(LOGIN_MESSAGE)).toBeVisible()
      const next = encodeURIComponent(baseURL ?? "")
      await expect(page.getByRole("link", { name: "Username and password" })).toHaveAttribute(
        "href",
        `/admin/login/?next=${next}`,
      )
      await expect(page.getByRole("link", { name: "Auth0" })).toHaveAttribute(
        "href",
        `/login/auth0/?next=${next}`,
      )
    })
  })
}

test.describe("login", () => {
  test.use({ cmsOptions: { session: CmsSession.Anonymous, anonymousStatus: 403 } })

  test("signs in through a provider and returns to the app", async ({ page }) => {
    await page.goto("")
    await page.getByRole("link", { name: "Auth0" }).click()
    await expect(page.getByRole("heading", { name: homePages.en.title })).toBeVisible()
  })

  test("shows a refused login and drops auth_error from the URL", async ({ page, baseURL }) => {
    await page.goto("?auth_error=email_in_use")
    await expect(page.getByRole("alert")).toHaveText(
      "This email address is already used with a different login method. Use that method to sign in.",
    )
    await expect(page).toHaveURL(baseURL ?? "")
    await expect(page.getByRole("link", { name: "Auth0" })).toHaveAttribute(
      "href",
      `/login/auth0/?next=${encodeURIComponent(baseURL ?? "")}`,
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
