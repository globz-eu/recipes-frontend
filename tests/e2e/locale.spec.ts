import { homePages } from "./fixtures"
import { expect, test } from "./mock-cms"

test("switches the language and keeps it after a reload", async ({ page }) => {
  await page.goto("")
  await page.getByRole("button", { name: "DE" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(homePages.de.title)
  await expect(page.getByRole("button", { name: "DE" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("listitem")).toHaveText(["Pfannkuchen", "Ratatouillefr"])
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(homePages.de.title)
})

test("closes an open recipe when the language changes", async ({ page }) => {
  await page.goto("#recipe-en-pancakes")
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Pancakes")
  await page.getByRole("button", { name: "FR" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(homePages.fr.title)
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible()
  await expect(page).not.toHaveURL(/#recipe-/)
})

test.describe("browser language", () => {
  test.use({ locale: "nl-NL" })

  test("starts in the browser language", async ({ page }) => {
    await page.goto("")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(homePages.nl.title)
  })
})
