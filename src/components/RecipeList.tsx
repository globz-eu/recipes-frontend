import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { fetchRecipes, recipesQueryKey } from '../api/recipes'
import { RecipeDetail } from './RecipeDetail'
import { RecipeMeta } from './RecipeMeta'

const HASH_PREFIX = '#recipe-'

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function getSelectedSlug(): string | null {
  const { hash } = window.location
  return hash.startsWith(HASH_PREFIX) ? decodeURIComponent(hash.slice(HASH_PREFIX.length)) : null
}

export function RecipeList() {
  const { data: recipes, isPending, error } = useQuery({
    queryKey: recipesQueryKey,
    queryFn: fetchRecipes,
  })
  const selectedSlug = useSyncExternalStore(subscribeToHash, getSelectedSlug)

  if (isPending) {
    return <p>Loading recipes...</p>
  }

  if (error) {
    return <p>Error loading recipes: {error.message}</p>
  }

  const selected = recipes.find((recipe) => recipe.slug === selectedSlug)
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
            <a href={`${HASH_PREFIX}${encodeURIComponent(recipe.slug)}`}>
              <h3>{recipe.title}</h3>
              <RecipeMeta recipe={recipe} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
