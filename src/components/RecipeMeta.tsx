import type { Recipe } from '../api/recipes'

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

interface RecipeMetaProps {
  recipe: Recipe
}

export function RecipeMeta({ recipe }: RecipeMetaProps) {
  const items: [string, string][] = []
  if (recipe.number_of_people != null) {
    items.push(['Serves', String(recipe.number_of_people)])
  }
  if (recipe.preparation_time != null) {
    items.push(['Preparation', formatMinutes(recipe.preparation_time)])
  }
  if (recipe.cooking_time != null) {
    items.push(['Cooking', formatMinutes(recipe.cooking_time)])
  }

  if (items.length === 0) return null

  return (
    <dl className="recipe-meta">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
