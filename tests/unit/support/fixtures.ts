import { vi } from "vitest"
import type { HomePage } from "../../../src/api/home"
import type { Recipe } from "../../../src/api/recipes"

export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 1,
    title: "Pancakes",
    slug: "pancakes",
    locale: "en",
    translation_key: "pancakes-key",
    ingredients: [],
    preparation: "",
    preparation_time: null,
    cooking_time: null,
    number_of_people: null,
    ...overrides,
  }
}

export function makeHomePage(overrides: Partial<HomePage> = {}): HomePage {
  return { title: "Recipes", description: "Family favourites", ...overrides }
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}
