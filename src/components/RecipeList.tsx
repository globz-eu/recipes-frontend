import { useQuery } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"
import { fetchRecipes, recipesQueryKey, type Recipe } from "../api/recipes"
import { LOCALES, type LocaleCode } from "../locale"
import { RecipeDetail } from "./RecipeDetail"

const HASH_PREFIX = "#recipe-"

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback)
  return () => window.removeEventListener("hashchange", callback)
}

// Slugs are only unique per locale, so the hash is `#recipe-<locale>-<slug>`.
function recipeHash(recipe: Recipe): string {
  return `${HASH_PREFIX}${recipe.locale}-${encodeURIComponent(recipe.slug)}`
}

function getSelectedHash(): string | null {
  const { hash } = window.location
  return hash.startsWith(HASH_PREFIX) ? hash : null
}

// Own-locale recipes first, then recipes without a translation in the current
// language, one per translation_key, taken from the first other locale that
// has them.
function recipesForLocale(recipesByLocale: Record<string, Recipe[]>, locale: LocaleCode): Recipe[] {
  const own = recipesByLocale[locale] ?? []
  const seen = new Set(own.map((recipe) => recipe.translation_key))
  const untranslated: Recipe[] = []
  for (const { code } of LOCALES) {
    if (code === locale) continue
    for (const recipe of recipesByLocale[code] ?? []) {
      if (seen.has(recipe.translation_key)) continue
      seen.add(recipe.translation_key)
      untranslated.push(recipe)
    }
  }
  return [...own, ...untranslated]
}

export function RecipeList({ locale }: { locale: LocaleCode }) {
  const { data, isPending, error } = useQuery({
    queryKey: recipesQueryKey,
    queryFn: fetchRecipes,
  })
  const selectedHash = useSyncExternalStore(subscribeToHash, getSelectedHash)

  if (isPending) {
    return <p>Loading recipes...</p>
  }

  if (error) {
    return <p>Error loading recipes: {error.message}</p>
  }

  const recipes = recipesForLocale(data.locales, locale)

  const selected = recipes.find((recipe) => recipeHash(recipe) === selectedHash)
  if (selected) {
    return <RecipeDetail recipe={selected} />
  }

  if (recipes.length === 0) {
    return <p>No recipes yet.</p>
  }

  return (
    <section className="recipe-list">
      <h2>Recipes</h2>
      <ul>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <a href={recipeHash(recipe)}>
              <h3>
                {recipe.title}
                {recipe.locale !== locale && (
                  <span className="recipe-lang" lang={recipe.locale}>
                    {recipe.locale}
                  </span>
                )}
              </h3>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
