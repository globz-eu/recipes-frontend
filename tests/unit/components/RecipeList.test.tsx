import { screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Recipe } from "../../../src/api/recipes"
import { RecipeList } from "../../../src/components/RecipeList"
import { renderWithQuery } from "../support/render"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

function makeRecipe(locale: string, key: string, id: number): Recipe {
  return {
    id,
    title: `${locale}-${key}`,
    slug: `${key}-${locale}`,
    locale,
    translation_key: key,
    ingredients: [],
    preparation: "",
    preparation_time: null,
    cooking_time: null,
    number_of_people: null,
  }
}

function stubRecipes(locales: Record<string, Recipe[]>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ locales }), {
        headers: { "Content-Type": "application/json" },
      }),
    ),
  )
}

async function listedTitles() {
  const headings = await screen.findAllByRole("heading", { level: 3 })
  return headings.map((heading) => heading.firstChild?.textContent)
}

beforeEach(() => window.history.pushState(null, "", "/"))

afterEach(() => vi.unstubAllGlobals())

describe("RecipeList ordering", () => {
  it("lists own-locale recipes first, then untranslated ones from other locales", async () => {
    stubRecipes({
      en: [makeRecipe("en", "a", 1)],
      de: [makeRecipe("de", "a", 2), makeRecipe("de", "b", 3)],
      fr: [makeRecipe("fr", "c", 4)],
    })
    renderWithQuery(<RecipeList locale="en" />)

    expect(await listedTitles()).toEqual(["en-a", "de-b", "fr-c"])
  })

  it("lists a translation_key once, from the first other locale that has it", async () => {
    stubRecipes({
      de: [makeRecipe("de", "x", 1)],
      fr: [makeRecipe("fr", "x", 2)],
      nl: [makeRecipe("nl", "x", 3)],
    })
    renderWithQuery(<RecipeList locale="en" />)

    expect(await listedTitles()).toEqual(["de-x"])
  })

  it("marks recipes from other locales with their language", async () => {
    stubRecipes({ en: [makeRecipe("en", "a", 1)], de: [makeRecipe("de", "b", 2)] })
    renderWithQuery(<RecipeList locale="en" />)

    expect(await screen.findByText("de")).toHaveAttribute("lang", "de")
    expect(screen.queryByText("en")).not.toBeInTheDocument()
  })

  it("shows a message when no locale has recipes", async () => {
    stubRecipes({})
    renderWithQuery(<RecipeList locale="en" />)

    expect(await screen.findByText("No recipes yet.")).toBeInTheDocument()
  })
})
