import { apiFetch } from './client'

export interface Recipe {
  id: number
  title: string
  slug: string
  // HTML rendered by the backend from the Wagtail rich text editor.
  ingredients: string
  preparation: string
  // Minutes.
  preparation_time: number | null
  cooking_time: number | null
  number_of_people: number | null
}

export const recipesQueryKey = ['recipes'] as const

export function fetchRecipes(): Promise<Recipe[]> {
  return apiFetch<Recipe[]>('/api/recipes/')
}
