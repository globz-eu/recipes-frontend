import { homePages } from "./fixtures"
import { CmsSession, expect, test } from "./mock-cms"

const API_ORIGIN = "http://cms.test"

test.describe("apiBaseUrl from config.json", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/frontend/config.json", (route) =>
      route.fulfill({ json: { apiBaseUrl: `${API_ORIGIN}/` } }),
    )
  })

  test.describe("signed in", () => {
    test.use({
      cmsOptions: { session: CmsSession.Editor, anonymousStatus: 403, apiOrigin: API_ORIGIN },
    })

    test("loads content from the configured CMS", async ({ page }) => {
      await page.goto("")
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(homePages.en.title)
      await expect(page.getByRole("link", { name: "Pancakes" })).toBeVisible()
      await expect(page.getByRole("link", { name: "Log out" })).toHaveAttribute(
        "href",
        /^http:\/\/cms\.test\/admin\/logout\/\?next=/,
      )
    })
  })

  test.describe("anonymous", () => {
    test.use({
      cmsOptions: { session: CmsSession.Anonymous, anonymousStatus: 403, apiOrigin: API_ORIGIN },
    })

    test("signs in on the configured CMS and returns to the app", async ({ page }) => {
      await page.goto("")
      await expect(page.locator("form.provider-login-form")).toHaveAttribute(
        "action",
        "http://cms.test/login/auth0/",
      )
      await page.getByRole("button", { name: "Auth0" }).click()
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(homePages.en.title)
    })
  })
})

test("reports a missing config.json", async ({ page }) => {
  await page.route("**/frontend/config.json", (route) => route.fulfill({ status: 404 }))
  await page.goto("")
  await expect(page.getByText("Could not load the application configuration.")).toBeVisible()
})
