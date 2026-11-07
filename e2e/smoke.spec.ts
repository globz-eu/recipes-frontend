import { expect, test } from "@playwright/test"

test("serves the built app under /frontend/", async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 403, json: { detail: "" } }))
  await page.goto("")
  await expect(page.locator("#root")).not.toBeEmpty()
})
