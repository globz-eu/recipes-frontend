import { homePages } from "./fixtures"
import { expect, test } from "./mock-cms"

test("shows the home page and the recipes, untranslated ones marked", async ({ page }) => {
  await page.goto("")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(homePages.en.title)
  await expect(page.getByText(homePages.en.description ?? "")).toBeVisible()
  const recipes = page.getByRole("listitem")
  // Pfannkuchen is the German translation of Pancakes, so it is not listed again.
  await expect(recipes).toHaveText(["Pancakes", "Ratatouillefr"])
  await expect(recipes.nth(1).locator("[lang=fr]")).toHaveText("fr")
})

test("opens a recipe through the URL hash and goes back to the list", async ({ page }) => {
  await page.goto("")
  await page.getByRole("link", { name: "Pancakes" }).click()
  await expect(page).toHaveURL(/#recipe-en-pancakes$/)
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Pancakes")
  await expect(page.getByRole("listitem")).toHaveText(["250 g flour", "2 eggs"])
  await expect(page.locator(".recipe-detail strong")).toHaveText("fry")
  await expect(page.locator(".recipe-meta")).toContainText("Serves4")
  await page.goBack()
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible()
})

test("opens a recipe from a deep link in another locale", async ({ page }) => {
  await page.goto("#recipe-fr-ratatouille")
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Ratatouille")
})

test("shows the list for a hash that matches no recipe", async ({ page }) => {
  await page.goto("#recipe-de-pancakes")
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible()
})
