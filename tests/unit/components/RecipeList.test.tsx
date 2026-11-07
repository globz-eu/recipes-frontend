import { act, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Recipe } from "../../../src/api/recipes"
import { RecipeList } from "../../../src/components/RecipeList"
import { jsonResponse, makeRecipe } from "../support/fixtures"
import { renderWithQuery } from "../support/render"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

function makeLocaleRecipe(locale: string, key: string, id: number): Recipe {
  return makeRecipe({
    id,
    title: `${locale}-${key}`,
    slug: `${key}-${locale}`,
    locale,
    translation_key: key,
  })
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
      en: [makeLocaleRecipe("en", "a", 1)],
      de: [makeLocaleRecipe("de", "a", 2), makeLocaleRecipe("de", "b", 3)],
      fr: [makeLocaleRecipe("fr", "c", 4)],
    })
    renderWithQuery(<RecipeList locale="en" />)

    expect(await listedTitles()).toEqual(["en-a", "de-b", "fr-c"])
  })

  it("lists a translation_key once, from the first other locale that has it", async () => {
    stubRecipes({
      de: [makeLocaleRecipe("de", "x", 1)],
      fr: [makeLocaleRecipe("fr", "x", 2)],
      nl: [makeLocaleRecipe("nl", "x", 3)],
    })
    renderWithQuery(<RecipeList locale="en" />)

    expect(await listedTitles()).toEqual(["de-x"])
  })

  it("marks recipes from other locales with their language", async () => {
    stubRecipes({ en: [makeLocaleRecipe("en", "a", 1)], de: [makeLocaleRecipe("de", "b", 2)] })
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

describe("RecipeList selection", () => {
  const pancakesEn = makeRecipe({ id: 1, title: "Pancakes", slug: "pancakes", locale: "en" })
  const pfannkuchenDe = makeRecipe({
    id: 2,
    title: "Pfannkuchen",
    slug: "pancakes",
    locale: "de",
    translation_key: "other-key",
  })

  it("links each recipe to a hash holding its locale and encoded slug", async () => {
    stubRecipes({ en: [makeRecipe({ slug: "mac & cheese", title: "Mac" })] })
    renderWithQuery(<RecipeList locale="en" />)

    expect(await screen.findByRole("link", { name: "Mac" })).toHaveAttribute(
      "href",
      "#recipe-en-mac%20%26%20cheese",
    )
  })

  it("shows the detail view of the recipe named by the hash", async () => {
    stubRecipes({ en: [pancakesEn] })
    window.history.pushState(null, "", "/#recipe-en-pancakes")
    renderWithQuery(<RecipeList locale="en" />)

    expect(await screen.findByRole("heading", { level: 2, name: "Pancakes" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Recipes" })).not.toBeInTheDocument()
  })

  it("tells recipes with the same slug apart by locale", async () => {
    stubRecipes({ en: [pancakesEn], de: [pfannkuchenDe] })
    window.history.pushState(null, "", "/#recipe-de-pancakes")
    renderWithQuery(<RecipeList locale="en" />)

    expect(await screen.findByRole("heading", { name: "Pfannkuchen" })).toBeInTheDocument()
  })

  it("falls back to the list when the hash names an unknown recipe", async () => {
    stubRecipes({ en: [pancakesEn] })
    window.history.pushState(null, "", "/#recipe-en-missing")
    renderWithQuery(<RecipeList locale="en" />)

    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument()
  })

  it("switches between list and detail when the hash changes", async () => {
    stubRecipes({ en: [pancakesEn] })
    renderWithQuery(<RecipeList locale="en" />)
    await screen.findByRole("heading", { name: "Recipes" })

    act(() => {
      window.location.hash = "#recipe-en-pancakes"
    })
    expect(await screen.findByRole("heading", { level: 2, name: "Pancakes" })).toBeInTheDocument()

    act(() => {
      window.location.hash = ""
    })
    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument()
  })
})

describe("RecipeList loading and errors", () => {
  it("shows a loading state first", () => {
    stubRecipes({})
    renderWithQuery(<RecipeList locale="en" />)

    expect(screen.getByText("Loading recipes...")).toBeInTheDocument()
  })

  it("shows the error when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "boom" }, 500)))
    renderWithQuery(<RecipeList locale="en" />)

    expect(await screen.findByText(/Error loading recipes/)).toBeInTheDocument()
  })
})
