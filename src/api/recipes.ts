import { apiFetch } from './client'

export interface Ingredient {
  quantity: number | null
  unit: string
  name: string
}

export interface Recipe {
  id: number
  title: string
  slug: string
  locale: string
  translation_key: string
  ingredients: Ingredient[]
  // HTML rendered by the backend from the Wagtail rich text editor.
  preparation: string
  // Minutes.
  preparation_time: number | null
  cooking_time: number | null
  number_of_people: number | null
}

export const recipesQueryKey = ['recipes'] as const

// Without ?locale= the API groups all recipes by locale code.
export interface RecipesByLocale {
  locales: Record<string, Recipe[]>
}

export function fetchRecipes(): Promise<RecipesByLocale> {
  return apiFetch<RecipesByLocale>('/api/recipes/')
}
