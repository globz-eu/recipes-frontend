import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { fetchRecipes, recipesQueryKey, type Recipe } from '../api/recipes'
import type { LocaleCode } from '../locale'
import { RecipeDetail } from './RecipeDetail'
import { RecipeMeta } from './RecipeMeta'

const HASH_PREFIX = '#recipe-'

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

// Slugs are only unique per locale, so the hash is `#recipe-<locale>-<slug>`.
function recipeHash(recipe: Recipe): string {
  return `${HASH_PREFIX}${recipe.locale}-${encodeURIComponent(recipe.slug)}`
}

function getSelectedHash(): string | null {
  const { hash } = window.location
  return hash.startsWith(HASH_PREFIX) ? hash : null
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

  const groups = Object.entries(data.locales).filter(
    ([code, recipes]) => code === locale && recipes.length > 0,
  )

  const selected = groups
    .flatMap(([, recipes]) => recipes)
    .find((recipe) => recipeHash(recipe) === selectedHash)
  if (selected) {
    return <RecipeDetail recipe={selected} />
  }

  if (groups.length === 0) {
    return <p>No recipes yet.</p>
  }

  return (
    <>
      {groups.map(([code, recipes]) => (
        <section className="recipe-list" key={code}>
          <h2>Recipes</h2>
          <ul>
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <a href={recipeHash(recipe)}>
                  <h3>{recipe.title}</h3>
                  <RecipeMeta recipe={recipe} showServes={false} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
