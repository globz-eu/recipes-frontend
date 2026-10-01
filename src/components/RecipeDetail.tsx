import type { Recipe } from '../api/recipes'
import { RecipeMeta } from './RecipeMeta'

interface RecipeDetailProps {
  recipe: Recipe
}

// preparation is HTML produced by Wagtail's rich text
// editor, which only lets editors enter whitelisted markup.
export function RecipeDetail({ recipe }: RecipeDetailProps) {
  return (
    <article className="recipe-detail">
      <a href="#" className="recipe-back">
        ← All recipes
      </a>
      <h2>{recipe.title}</h2>
      <RecipeMeta recipe={recipe} />
      {recipe.ingredients.length > 0 && (
        <section>
          <h3>Ingredients</h3>
          <ul>
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>
                {[ingredient.quantity, ingredient.unit, ingredient.name]
                  .filter((part) => part !== null && part !== '')
                  .join(' ')}
              </li>
            ))}
          </ul>
        </section>
      )}
      {recipe.preparation && (
        <section>
          <h3>Preparation</h3>
          <div dangerouslySetInnerHTML={{ __html: recipe.preparation }} />
        </section>
      )}
    </article>
  )
}
