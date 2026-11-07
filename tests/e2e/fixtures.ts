import type { AuthProvider } from "../../src/api/auth"
import type { HomePage } from "../../src/api/home"
import type { Recipe, RecipesByLocale } from "../../src/api/recipes"
import type { LocaleCode } from "../../src/locale"

export const homePages: Record<LocaleCode, HomePage> = {
  en: { title: "Family recipes", description: "Dishes we cook again and again" },
  de: { title: "Familienrezepte", description: null },
  fr: { title: "Recettes de famille", description: null },
  nl: { title: "Familierecepten", description: null },
}

export const providers: AuthProvider[] = [
  { id: "local", label: "Username and password", login_url: "/admin/login/" },
  { id: "auth0", label: "Auth0", login_url: "/login/auth0/" },
]

const recipeDefaults = {
  ingredients: [],
  preparation: "",
  preparation_time: null,
  cooking_time: null,
  number_of_people: null,
}

export const pancakes: Recipe = {
  ...recipeDefaults,
  id: 1,
  title: "Pancakes",
  slug: "pancakes",
  locale: "en",
  translation_key: "pancakes-key",
  ingredients: [
    { quantity: 250, unit: "g", name: "flour" },
    { quantity: 2, unit: "", name: "eggs" },
  ],
  preparation: "<p>Whisk everything and <strong>fry</strong>.</p>",
  preparation_time: 15,
  cooking_time: 20,
  number_of_people: 4,
}

export const pfannkuchen: Recipe = {
  ...recipeDefaults,
  id: 2,
  title: "Pfannkuchen",
  slug: "pfannkuchen",
  locale: "de",
  translation_key: "pancakes-key",
}

// Only in French, so other languages list it as untranslated.
export const ratatouille: Recipe = {
  ...recipeDefaults,
  id: 3,
  title: "Ratatouille",
  slug: "ratatouille",
  locale: "fr",
  translation_key: "ratatouille-key",
}

// The CMS always sends every locale key, empty ones included.
export const recipesByLocale: RecipesByLocale = {
  locales: { en: [pancakes], de: [pfannkuchen], fr: [ratatouille], nl: [] },
}
